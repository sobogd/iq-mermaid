# IQ Mermaid

Free online [mermaid](https://mermaid.js.org) editor at **https://iq-mermaid.com** —
a visual canvas and the mermaid source, kept in sync. No account, no paid tier,
no server-side storage: everything runs in the browser and the current diagram
lives in local storage.

## Layout

```
app/(en)/          English pages at the root: /, /blog, /blog/<id>, /privacy, /terms
app/[seg]/         The same pages for the other 33 locales, under /<locale>
app/_landing/      Marketing components (hero, spotlights, comparison, faq, footer)
app/_landing/desktop/  PostHog-style desktop shell: DesktopShell (editor background +
                   Taskbar glass island + AppWindow), Taskbar, AppWindow closable
                   window with internal scroll + [minimize][close] controls, the
                   EditorBackdrop (shared editor loaded under the window) and
                   OpenEditorButton
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

## Localization: everything ships in all 34 locales

The site is fully localized into **34 languages** (`content/chrome/` for the
marketing pages, `content/editor/` for the editor UI). This is a hard rule, not
a habit:

- **Any user-facing string change — new copy, a rename, a wording tweak, a
  removed button, a rewritten claim — must be applied in every locale, always.**
  Never change only the English master and never hardcode new UI text in a
  component in one language.
- Work flow: 1) update the English master (`content/chrome/en.json` or
  `content/editor/en.json`) first, 2) mirror the exact same keys + translated
  values in the other 33 locale files, 3) run `npm run content` (it validates
  that every locale's key tree matches the English master and fails CI
  otherwise).
- The same applies to **string arrays** (stat cards, FAQ items, comparison
  rows, spotlights, blog posts): renumber/shape changes touch every locale.
- When the change is only structural (no text) — for example moving a button,
  changing its destination, or reworking a layout — still double-check that no
  hardcoded English label was left behind anywhere in the UI.

If you find yourself about to ship copy in fewer than 34 locales, stop and do
the rest first.

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

## Design: the PostHog "desktop"

Every marketing page (home, guides/blog, legal) renders as a desktop metaphor in
the style of [posthog.com](https://posthog.com): a flat sage-green wallpaper
behind, a floating translucent glass **taskbar** "island" on top, and the page's
content inside a **closable AppWindow** whose body **scrolls internally** rather
than the page.

The **mermaid editor is now the shared background** of the whole site. On every
page it is lazy-loaded under the window (SSR never pays for the ~500 kB mermaid
bundle) and its chrome — new/open/download/code/sign-in, undo/redo, zoom — lives
in a floating **left dock island** that stays visible above the window. Closing
the window (its only control is a [close X] button, no minimize, no reopen
pill) reveals the already-booted editor for good; "Open editor" buttons collapse
the window instead of navigating to a `/app` route (which no longer exists — it
redirects to the locale home). The canvas area is clickable around the window
(the canvas wrapper passes clicks through to the editor layer); actions that
persist or export (new/open/save/copy/download) raise an inline sign-in gate.

The palette is PostHog's (paper white surfaces, warm-grey text, blue accent) on
the sage-green backdrop, with amber `#ea9d2a` for accent buttons and the logo
square. Custom scrollbars are set globally in `app/globals.css` so every
scrollable area shows a styled bar on macOS, Windows and touch devices. See
`app/_landing/desktop/`.
