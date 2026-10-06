# Is It Worth Watching?

A deliberately simple movie recommendation site. The static pages and the `/query` endpoint run together on Cloudflare Workers; the Worker keeps the TMDB API key private.

## Run locally

Use Node.js 22 or newer. Install the locked dependencies and create a `.dev.vars` file in the project root. `TMDB_API_KEY` can contain either the TMDB v3 API key or the API Read Access Token:

```text
TMDB_API_KEY=your_tmdb_credential
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

Paste your TMDB credential only into Wrangler’s secret prompt. To attach a custom domain, open the Worker in the Cloudflare dashboard and add it under **Settings → Domains & Routes**.

The Worker serves the files in `public/` and handles `POST /query`. Static pages use Cloudflare Workers Static Assets. Movie and TV title search runs through the Worker and requires the `TMDB_API_KEY` secret.

## Give back

Enjoy the project? [Give back through GiveWell's Top Charities Fund](https://www.givewell.org/top-charities-fund). It's pooled, and GiveWell publishes its research and impact estimates. GiveWell takes no fee; payment processing fees may apply. Impact estimates aren't guarantees.
