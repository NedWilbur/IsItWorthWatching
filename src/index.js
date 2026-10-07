import { MAX_QUERY_LENGTH } from "../public/movies.js";
import { HttpError, jsonResponse, readJson } from "./http.js";
import { searchTMDB } from "./tmdb.js";

async function handleSearch(request, apiKey) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }

  try {
    const body = await readJson(request);
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query || query.length > MAX_QUERY_LENGTH) {
      throw new HttpError(400, `Enter a search between 1 and ${MAX_QUERY_LENGTH} characters`);
    }
    const mediaType = body?.media_type ?? "all";
    if (!["all", "movie", "tv"].includes(mediaType)) {
      throw new HttpError(400, "Invalid media type filter");
    }

    return jsonResponse(await searchTMDB(query, mediaType, apiKey));
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
    }
    console.error("Unexpected search failure");
    return jsonResponse({ error: "Movie search is temporarily unavailable" }, 500);
  }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/query") {
      return handleSearch(request, env.TMDB_API_KEY);
    }
    return env.ASSETS.fetch(request);
  },
};
