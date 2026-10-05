# Is It Worth Watching?

A deliberately simple movie recommendation site. The static pages and the `/query` endpoint run together on Cloudflare Workers; the Worker keeps the TMDB API key private.

## Run locally

Use Node.js 22 or newer. Install the locked dependencies and create a `.dev.vars` file in the project root:

```text
TMDB_API_KEY=your_tmdb_v3_api_key
```

Then run:

```sh
npm ci
npm run dev
```

Wrangler prints a local URL. `.dev.vars` is ignored by Git; never commit the key.

## Deploy to Cloudflare

```sh
npx wrangler login
npx wrangler secret put TMDB_API_KEY
npm run deploy
```

Paste the TMDB v3 API key only into Wrangler’s secret prompt. To attach a custom domain, open the Worker in the Cloudflare dashboard and add it under **Settings → Domains & Routes**.

The Worker serves the files in `public/` and handles `POST /query`. Static pages use Cloudflare Workers Static Assets. The movie search is a Worker request and requires the `TMDB_API_KEY` secret.
