const MAX_QUERY_LENGTH = 100;
const MAX_BODY_BYTES = 2048;
const MAX_RESULTS = 7;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function searchMovies(request, apiKey) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Search request is too large" }, 413);
  }

  let body;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Search request is too large" }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return jsonResponse({ error: "Enter a search between 1 and 100 characters" }, 400);
  }
  if (!apiKey) {
    return jsonResponse({ error: "Movie search is not configured" }, 500);
  }

  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/movie");
  tmdbUrl.searchParams.set("query", query);
  tmdbUrl.searchParams.set("api_key", apiKey);

  try {
    const response = await fetch(tmdbUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn(`TMDB search returned ${response.status}`);
      return jsonResponse({ error: "Movie search is temporarily unavailable" }, 502);
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return jsonResponse(results.slice(0, MAX_RESULTS).map((movie) => ({
      title: movie.title,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
    })));
  } catch {
    console.error("TMDB search request failed");
    return jsonResponse({ error: "Movie search is temporarily unavailable" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/query") {
      return searchMovies(request, env.TMDB_API_KEY);
    }

    // Keep the original extensionless page URLs while serving static assets.
    if (url.pathname === "/about" || url.pathname === "/beer") {
      url.pathname += ".html";
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  },
};
