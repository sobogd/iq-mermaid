# IQ Mermaid — notes for agents

Free mermaid diagram editor on **iq-mermaid.com**. Next.js 16, mostly static,
with an email-OTP auth flow and per-account documents stored in Postgres
(`app/api/auth/*`, `app/api/documents/*`); there are no payments and no paid
tier. Usage is tracked by a cookieless, first-party pipeline (`lib/analytics.ts`
posts straight to iq-metrix under the e.iq-mermaid.com alias — same pattern as
translator, see its `docs/analytics.md`); nothing is stored on the visitor's
device, so the site still needs no cookie banner. Read `README.md` first for
the layout; this file only covers the things that are easy to get wrong.

## Rules

- **All user-facing copy ships in all 34 locales — always.** Any new string,
  rename, wording tweak, removed label or rewritten claim has to land in every
  locale file (`content/chrome/*.json` for the site, `content/editor/*.json`
  for the editor UI), English master first, then run `npm run content`. Do not
  hardcode new English text in components and do not ship copy in fewer than
  34 locales.
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
  are a port of a standalone Vite app; they are excluded from `tsc` (`allowJs`,
  not in `include`). Strings come from the `t` prop (`app/_editor/texts.ts`
  declares its shape) — never hardcode UI text there.
- **One mermaid instance**, configured in `app/_editor/mermaid-client.js`
  (`securityLevel: "strict"` — this editor invites pasted diagrams, and
  "loose" lets a paste run `click X call fn()`). Exports live in
  `app/_editor/export.js` and act on the shared source, so both tabs export.
- **mermaid must stay out of the marketing bundle.** It is ~500 kB and touches
  `document` at import time, so it is only ever reached through
  `EditorClient.tsx`'s `dynamic(..., { ssr: false })`. The hero's diagram is a
  hand-drawn SVG (`DiagramPreview.tsx`) for exactly this reason.
- **The legal text is English-only** and lives in TypeScript
  (`app/_landing/legal-content.ts`); the legal *pages* exist in every locale
  (`/privacy`, `/terms` and `/<locale>/privacy`, `/<locale>/terms`) with
  localized chrome around the English body.
- Gate before handing work over: `npm run typecheck && npm run content && npm run build`.

## Gotchas

- Adding a page? If it should be localized, create it under `app/[seg]/`
  (like `/blog`, `/privacy`, `/terms`) so every locale gets it; `proxy.ts`
  language-routes only the roots listed in `ROUTED`.
- Next merges metadata one level deep only: a page declaring its own
  `openGraph` replaces the root layout's object wholesale. Spread `OG_IMAGE`
  and `TWITTER_CARD` from `lib/site.ts` in every page.
- Behind nginx TLS termination `req.url` reports `http://`. Build absolute
  URLs from `SITE_URL`, never from the request.
- **Never put the rendered diagram back on `dangerouslySetInnerHTML`.** React 19
  re-applies that prop on every commit that touches the element (React 18 only
  wrote when the string changed), so panning alone reparsed the SVG and threw
  away the listeners wired to it — selection and every armed mode died
  silently. `VisualEditor` writes it in a `useLayoutEffect` instead.
- **PNG export needs `htmlLabels: false`.** Chrome taints a canvas the moment
  an SVG containing `<foreignObject>` is drawn on it, and mermaid puts every
  HTML label in one — `toBlob` then throws. `renderForExport` re-renders with
  an init directive that turns them off.
- **Do not capture the pointer on `pointerdown`.** Capturing retargets the
  events the browser builds `click`/`dblclick` from, which kills
  double-click-to-rename. Capture only once a drag has actually started.
- Deploy fires on push to `main` (see `.github/workflows/deploy.yml`).
