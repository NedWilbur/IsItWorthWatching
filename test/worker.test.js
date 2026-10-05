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

test("/about maps to the static about page", async () => {
  let assetPath;
  const response = await worker.fetch(request("/about?source=test"), {
    ASSETS: {
      fetch: async (assetRequest) => {
        assetPath = new URL(assetRequest.url).pathname;
        return new Response("about page");
      },
    },
  });

  assert.equal(assetPath, "/about.html");
  assert.equal(await response.text(), "about page");
});

test("POST /query returns a short, client-ready result list", async (t) => {
  const results = Array.from({ length: 8 }, (_, index) => ({
    title: `Movie ${index + 1}`,
    release_date: "2020-01-01",
    vote_average: 7,
    vote_count: 100,
    overview: "Not returned to the browser",
  }));

  t.mock.method(globalThis, "fetch", async (url) => {
    const tmdbUrl = new URL(url);
    assert.equal(tmdbUrl.pathname, "/3/search/movie");
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
  assert.equal(movies.length, 7);
  assert.deepEqual(movies[0], {
    title: "Movie 1",
    release_date: "2020-01-01",
    vote_average: 7,
    vote_count: 100,
  });
  assert.equal("overview" in movies[0], false);
});
