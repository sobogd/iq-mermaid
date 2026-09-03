# IQ Mermaid — notes for agents

Free mermaid diagram editor on **iq-mermaid.com**. Next.js 16, fully static,
no database, no API routes, no auth, no analytics, no payments. Read
`README.md` first for the layout; this file only covers the things that are
easy to get wrong.

## Rules

- **Content is data, code is layout.** Copy lives in `content/**.json`, never
  inline in a component. `content/index.ts` is GENERATED — run
  `node scripts/gen-content-index.mjs` after touching the content tree, and
  commit the result (CI diffs it).
- **English is the master.** `content/chrome/en.json`, `content/editor/en.json`
  and `content/blog/<id>/en.json` define the key tree; every other locale must
  match it exactly. `node scripts/validate-content.mjs` enforces that.
- **34 locales**, listed in `lib/locales.ts`. A locale ships only when BOTH its
  chrome and its editor JSON exist (`READY_LOCALES` in the generated index) —
  half a locale renders a half-English page.
- **Blog slugs are English in every locale** (`/de/blog/mermaid-syntax-cheat-sheet`).
  That is what makes the language switcher a pure prefix swap
  (`swapLocale` in `lib/locale-paths.ts`).
- **The editor is `.jsx` on purpose.** `app/_editor/{VisualEditor,TextEditor,EditorShell}.jsx`
  are a near-verbatim port of a standalone Vite app; they are excluded from
  `tsc` (`allowJs`, not in `include`). Strings come from the `t` prop
  (`app/_editor/texts.ts` declares its shape) — never hardcode UI text there.
- **mermaid must stay out of the marketing bundle.** It is ~500 kB and touches
  `document` at import time, so it is only ever reached through
  `EditorClient.tsx`'s `dynamic(..., { ssr: false })`. The hero's diagram is a
  hand-drawn SVG (`DiagramPreview.tsx`) for exactly this reason.
- **Legal pages are English-only** and live in TypeScript
  (`app/_landing/legal-content.ts`), not in the locale JSONs.
- Gate before handing work over: `npm run typecheck && npm run content && npm run build`.

## Gotchas

- Adding a new unprefixed English path? Add it to `EN_ONLY_PATHS` in
  `proxy.ts`, or a non-English visitor gets a 302 into a 404.
- Next merges metadata one level deep only: a page declaring its own
  `openGraph` replaces the root layout's object wholesale. Spread `OG_IMAGE`
  and `TWITTER_CARD` from `lib/site.ts` in every page.
- Behind nginx TLS termination `req.url` reports `http://`. Build absolute
  URLs from `SITE_URL`, never from the request.
- Deploy is the `release` branch, not `main`.
