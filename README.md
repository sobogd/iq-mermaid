# IQ Mermaid

Free online [mermaid](https://mermaid.js.org) editor at **https://iq-mermaid.com** —
a visual canvas and the mermaid source, kept in sync. No account, no paid tier,
no server-side storage: everything runs in the browser and the current diagram
lives in local storage.

## Layout

```
app/(en)/          English pages at the root: /, /app, /blog, /blog/<id>, /privacy, /terms
app/[seg]/         The same pages for the other 33 locales, under /<locale>
app/_landing/      Marketing components (header, hero, spotlights, comparison, faq, footer)
app/_landing/blog/ Blog templates + the markdown-lite inline renderer
app/_editor/       The editor itself (ported from a standalone Vite app, .jsx)
content/chrome/    Marketing copy, one JSON per locale
content/editor/    Editor UI strings, one JSON per locale
content/blog/      <article-id>/<locale>.json + manifest.json
content/index.ts   GENERATED — static imports of everything above
lib/               Locales, paths, hreflang, JSON-LD, site constants
nginx/             Reference copy of the prod vhost
```

## Local

```bash
npm install
npm run dev          # http://localhost:3000
```

## Gates

```bash
npm run typecheck    # tsc --noEmit
npm run content      # regenerate content/index.ts + validate every locale
npm run build
```

`npm run content` must be re-run after adding or removing any file under
`content/` — the index is a generated file and CI fails if it is stale.

## Deploy

Push to **`release`** (not `main`) triggers `.github/workflows/deploy.yml`:
build on the runner, scp to the VPS, `pm2 restart iq-mermaid`, then an
IndexNow ping for the pages this push changed.

```bash
git push origin main && git push origin main:release
```

Prod runs on port **8204** behind nginx (`nginx/iq-mermaid.conf`). Repository
secrets: `SERVER_IP`, `SSH_KEY`, `INDEXNOW_KEY` — that is the complete list,
because the app has no database, no API keys and no third-party services.
