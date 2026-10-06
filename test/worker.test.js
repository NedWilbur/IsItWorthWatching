import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

function request(path, options = {}) {
  return new Request(`https://example.test${path}`, options);
}

test("GET /query is rejected with POST guidance", async () => {
  const response = await worker.fetch(request("/query"), {});

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
});

test("search reports a missing TMDB key without calling TMDB", async () => {
  const response = await worker.fetch(request("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Alien" }),
  }), {});

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Movie search is not configured",
    code: "missing_api_key",
  });
});

test("/beer is passed through to static assets", async () => {
  let assetPath;
  const response = await worker.fetch(request("/beer?source=test"), {
    ASSETS: {
      fetch: async (assetRequest) => {
        assetPath = new URL(assetRequest.url).pathname;
        return new Response("Not found", { status: 404 });
      },
    },
  });

  assert.equal(assetPath, "/beer");
  assert.equal(response.status, 404);
});

test("POST /query returns the full client-ready result page", async (t) => {
  const results = Array.from({ length: 8 }, (_, index) => ({
    media_type: "movie",
    title: `Movie ${index + 1}`,
    release_date: "2020-01-01",
    overview: "A short movie summary",
    poster_path: "/movie-poster.jpg",
    vote_average: 7,
    vote_count: 100,
  }));
  results[1] = {
    media_type: "tv",
    name: "Show 2",
    first_air_date: "2020-01-01",
    vote_average: 7,
    vote_count: 100,
    overview: "A short TV summary",
    poster_path: "/tv-poster.jpg",
  };
  results.push({ media_type: "person", name: "Ignored person" });

  t.mock.method(globalThis, "fetch", async (url) => {
    const tmdbUrl = new URL(url);
    assert.equal(tmdbUrl.pathname, "/3/search/multi");
    assert.equal(tmdbUrl.searchParams.get("query"), "Alien");
    assert.equal(tmdbUrl.searchParams.get("api_key"), "test-key");
    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  });

  const response = await worker.fetch(request("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: " Alien " }),
  }), { TMDB_API_KEY: "test-key" });

  assert.equal(response.status, 200);
  const movies = await response.json();
  assert.equal(movies.length, 8);
  assert.deepEqual(movies[0], {
    media_type: "movie",
    title: "Movie 1",
    release_date: "2020-01-01",
    overview: "A short movie summary",
    poster_path: "/movie-poster.jpg",
    vote_average: 7,
    vote_count: 100,
  });
  assert.deepEqual(movies[1], {
    media_type: "tv",
    title: "Show 2",
    release_date: "2020-01-01",
    overview: "A short TV summary",
    poster_path: "/tv-poster.jpg",
    vote_average: 7,
    vote_count: 100,
  });
});

test("POST /query sends a TMDB read access token as a Bearer token", async (t) => {
  const bearerToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature";

  t.mock.method(globalThis, "fetch", async (url, options) => {
    const tmdbUrl = new URL(url);
    assert.equal(tmdbUrl.searchParams.has("api_key"), false);
    assert.equal(new Headers(options.headers).get("Authorization"), `Bearer ${bearerToken}`);
    return new Response(JSON.stringify({ results: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  });

  const response = await worker.fetch(request("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Alien" }),
  }), { TMDB_API_KEY: bearerToken });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});
