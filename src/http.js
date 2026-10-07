const MAX_BODY_BYTES = 2048;

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export async function readJson(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    throw new HttpError(413, "Search request is too large");
  }
  if (!request.body) throw new HttpError(400, "Invalid JSON");

  // Bound memory even when Content-Length is absent or inaccurate.
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, "Search request is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON");
  } finally {
    reader.releaseLock();
  }
}
