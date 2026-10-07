import { isPosterPath, MAX_RESULTS } from "../public/movies.js";
import { HttpError } from "./http.js";

const TMDB_TIMEOUT = 8000;
const UNAVAILABLE_MESSAGE = "Movie search is temporarily unavailable";

export async function searchTMDB(query, mediaType, apiKey) {
  const credential = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!credential) {
    throw new HttpError(500, "Movie search is not configured", "missing_api_key");
  }

  const searchType = mediaType === "all" ? "multi" : mediaType;
  const url = new URL(`https://api.themoviedb.org/3/search/${searchType}`);
  url.searchParams.set("query", query);
  const headers = new Headers({ Accept: "application/json" });
  if (credential.startsWith("eyJ")) {
    headers.set("Authorization", `Bearer ${credential}`);
  } else {
    url.searchParams.set("api_key", credential);
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TMDB_TIMEOUT),
    });
    if (!response.ok) {
      console.warn("TMDB search rejected", { status: response.status });
      if (response.status === 401 || response.status === 403) {
        throw new HttpError(502, "TMDB rejected the API key", "invalid_api_key");
      }
      throw new HttpError(502, UNAVAILABLE_MESSAGE);
    }

    const data = await response.json();
    if (!Array.isArray(data?.results)) throw new Error("Unexpected TMDB response");
    return data.results
      .filter((item) => item && typeof item === "object" && !Array.isArray(item)
        && (mediaType !== "all" || item.media_type === "movie" || item.media_type === "tv"))
      .slice(0, MAX_RESULTS)
      .map((item) => normalizeMovie(item, mediaType));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // Avoid logging URLs, request bodies, or credentials from upstream errors.
    console.error("TMDB search failed", {
      reason: error?.name === "TimeoutError" ? "timeout" : "invalid_response_or_network",
    });
    throw new HttpError(502, UNAVAILABLE_MESSAGE);
  }
}

function normalizeMovie(item, filter) {
  const mediaType = filter === "all" ? item.media_type : filter;
  const title = mediaType === "tv" ? item.name : item.title;
  const date = mediaType === "tv" ? item.first_air_date : item.release_date;
  return {
    media_type: mediaType,
    title: typeof title === "string" && title.trim() ? title.trim() : "Untitled",
    release_date: typeof date === "string" ? date : "",
    overview: typeof item.overview === "string" ? item.overview : "",
    poster_path: isPosterPath(item.poster_path) ? item.poster_path : null,
    vote_average: Number.isFinite(item.vote_average) && item.vote_average >= 0 && item.vote_average <= 10
      ? item.vote_average : 0,
    vote_count: Number.isSafeInteger(item.vote_count) && item.vote_count >= 0 ? item.vote_count : 0,
  };
}
