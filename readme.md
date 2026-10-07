# Is It Worth Watching?

Pick a movie or show. Get a yes or no. Keep expectations manageable.

## The very complicated algorithm

Fewer than 50 ratings? **Not enough data.** Otherwise, a TMDB average of 6/10 or higher means **Yes.** Anything lower means **No.**

The "~# people say" count is an estimate: 40% of total ratings for Yes, 60% for No.

## Run locally

Use Node.js 22+. Create `.dev.vars` in the project root with your TMDB API key or API Read Access Token:

```text
TMDB_API_KEY=your_tmdb_credential
```

```sh
npm ci
npm run dev
```

Open the URL Wrangler prints. `.dev.vars` is ignored by Git; keep your credential there.

## Deploy

```sh
npx wrangler login
npx wrangler secret put TMDB_API_KEY
npm run deploy
```

For Git-connected builds, add `TMDB_API_KEY` as a **Secret** under the Worker's **Settings → Variables & Secrets** and deploy the change. **Settings → Build** secrets only reach the build process; the running Worker needs its own secret.

## Under the hood

Plain HTML, CSS, and JavaScript. No framework or frontend build step.

- `public/script.js` handles the UI; `public/search.js` handles requests.
- `public/movies.js` holds the shared scoring rules and response contract.
- `src/index.js` handles HTTP, `src/http.js` bounds request bodies, and `src/tmdb.js` talks to TMDB. The credential stays in the Worker.

Run the checks with `npm test`.

Broke something? [Open an issue](https://github.com/NedWilbur/IsItWorthWatching/issues).

Enjoying it? [Give back](https://www.givewell.org/top-charities-fund).
