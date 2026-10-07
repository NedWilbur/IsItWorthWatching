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

test("unknown routes are passed through to static assets", async () => {
  let assetPath;
  const response = await worker.fetch(request("/unknown?source=test"), {
    ASSETS: {
      fetch: async (assetRequest) => {
        assetPath = new URL(assetRequest.url).pathname;
        return new Response("Not found", { status: 404 });
      },
    },
  });

  assert.equal(assetPath, "/unknown");
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

test("invalid search inputs are rejected before contacting TMDB", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Invalid input should not reach TMDB");
  });
  const cases = [
    ["{", 400],
    ["null", 400],
    [JSON.stringify({ query: "   " }), 400],
    [JSON.stringify({ query: "a".repeat(101) }), 400],
    [JSON.stringify({ query: "Alien", media_type: "person" }), 400],
    [JSON.stringify({ query: "Alien", padding: "é".repeat(1100) }), 413],
  ];

  for (const [body, status] of cases) {
    const response = await worker.fetch(request("/query", { method: "POST", body }), {
      TMDB_API_KEY: "test-key",
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(typeof (await response.json()).error, "string");
  }
  assert.equal(upstream.mock.callCount(), 0);
});

for (const [filter, searchType, titleField, dateField] of [
  ["movie", "movie", "title", "release_date"],
  ["tv", "tv", "name", "first_air_date"],
]) {
  test(`${filter} filter uses its TMDB endpoint and normalizes the result`, async (t) => {
    t.mock.method(globalThis, "fetch", async (url) => {
      assert.equal(new URL(url).pathname, `/3/search/${searchType}`);
      return Response.json({ results: [{
        [titleField]: " A title ",
        [dateField]: "2021-01-01",
        overview: null,
        poster_path: "/../invalid.jpg",
        vote_average: "7",
        vote_count: null,
      }, null, "invalid"] });
    });

    const response = await worker.fetch(request("/query", {
      method: "POST",
      body: JSON.stringify({ query: "title", media_type: filter }),
    }), { TMDB_API_KEY: "test-key" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{
      media_type: filter,
      title: "A title",
      release_date: "2021-01-01",
      overview: "",
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
    }]);
  });
}

test("search caps the result page after removing unrelated entries", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    results: [null, { media_type: "person" }, ...Array.from({ length: 25 }, (_, index) => ({
      media_type: "movie", title: `Title ${index}`, vote_average: 7, vote_count: 100,
    }))],
  }));

  const response = await worker.fetch(request("/query", {
    method: "POST", body: JSON.stringify({ query: "title" }),
  }), { TMDB_API_KEY: "test-key" });
  const results = await response.json();
  assert.equal(results.length, 20);
  assert.equal(results[19].title, "Title 19");
});

for (const [name, body] of [
  ["missing results", {}],
  ["null response", null],
  ["invalid results", { results: "invalid" }],
]) {
  test(`malformed TMDB data (${name}) is an error rather than no matches`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json(body));
    t.mock.method(console, "error", () => {});
    const response = await worker.fetch(request("/query", {
      method: "POST", body: JSON.stringify({ query: "Alien" }),
    }), { TMDB_API_KEY: "test-key" });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, "Movie search is temporarily unavailable");
  });
}

for (const status of [401, 403, 429, 500]) {
  test(`TMDB HTTP ${status} becomes a controlled API error`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("Upstream error", { status }));
    t.mock.method(console, "warn", () => {});
    const response = await worker.fetch(request("/query", {
      method: "POST", body: JSON.stringify({ query: "Alien" }),
    }), { TMDB_API_KEY: "test-key" });
    assert.equal(response.status, 502);
    const data = await response.json();
    assert.equal(data.code, status === 401 || status === 403 ? "invalid_api_key" : undefined);
  });
}

test("an upstream timeout returns a controlled error", async (t) => {
  const timeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", () => timeout(10));
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", (url, { signal }) => new Promise((resolve, reject) => {
    // Keep the event loop alive: AbortSignal.timeout alone uses an unreferenced timer.
    const timer = setTimeout(() => reject(new Error("Request was not timed out")), 1000);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  }));

  const response = await worker.fetch(request("/query", {
    method: "POST", body: JSON.stringify({ query: "Alien" }),
  }), { TMDB_API_KEY: "test-key" });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "Movie search is temporarily unavailable");
});
