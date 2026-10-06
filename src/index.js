const MAX_QUERY_LENGTH = 100;
const MAX_BODY_BYTES = 2048;
const MAX_RESULTS = 20;

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

async function servePoster(pathname) {
  const match = pathname.match(/^\/poster\/([a-z0-9_-]+\.(?:jpe?g|png|webp))$/i);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const image = await fetch(`https://image.tmdb.org/t/p/w185/${match[1]}`, {
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    const contentType = image.headers.get("content-type") || "";
    if (!image.ok || !contentType.startsWith("image/")) {
      return new Response("Poster unavailable", {
        status: 404,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    return new Response(image.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Poster unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
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
  const mediaType = body?.media_type ?? "all";
  if (!["all", "movie", "tv"].includes(mediaType)) {
    return jsonResponse({ error: "Invalid media type filter" }, 400);
  }
  const credential = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!credential) {
    return jsonResponse({ error: "Movie search is not configured", code: "missing_api_key" }, 500);
  }

  const tmdbSearchType = mediaType === "all" ? "multi" : mediaType;
  const tmdbUrl = new URL(`https://api.themoviedb.org/3/search/${tmdbSearchType}`);
  tmdbUrl.searchParams.set("query", query);
  const headers = new Headers({ Accept: "application/json" });
  if (credential.startsWith("eyJ")) {
    headers.set("Authorization", `Bearer ${credential}`);
  } else {
    tmdbUrl.searchParams.set("api_key", credential);
  }

  try {
    const response = await fetch(tmdbUrl, {
      headers,
    });
    if (!response.ok) {
      console.warn(`TMDB search returned ${response.status}`);
      if (response.status === 401 || response.status === 403) {
        return jsonResponse({ error: "TMDB rejected the API key", code: "invalid_api_key" }, 502);
      }
      return jsonResponse({ error: "Movie search is temporarily unavailable" }, 502);
    }

    const data = await response.json();
    const results = Array.isArray(data.results)
      ? data.results.filter((item) => mediaType !== "all"
        ? true
        : item.media_type === "movie" || item.media_type === "tv")
      : [];
    return jsonResponse(results.slice(0, MAX_RESULTS).map((item) => ({
      media_type: mediaType === "all" ? item.media_type : mediaType,
      title: (mediaType === "tv" || item.media_type === "tv") ? item.name : item.title,
      release_date: (mediaType === "tv" || item.media_type === "tv") ? item.first_air_date : item.release_date,
      overview: typeof item.overview === "string" ? item.overview : "",
      poster_path: typeof item.poster_path === "string" && item.poster_path.startsWith("/")
        ? item.poster_path
        : null,
      vote_average: item.vote_average,
      vote_count: item.vote_count,
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

    if (url.pathname.startsWith("/poster/")) {
      return servePoster(url.pathname);
    }

    return env.ASSETS.fetch(request);
  },
};
