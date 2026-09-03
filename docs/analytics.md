# Analytics (cookieless)

This app does not store analytics itself. `lib/analytics.ts` batches
`page`/`action`/`name` events client-side and POSTs them directly to
**iq-metrix**, a standalone ingest service (separate repo, sibling to this
one, not part of this app) that owns hashing, visit resolution and storage.
Nothing is stored on the visitor's device, so the site still needs no cookie
banner — that claim is made in the privacy policy
(`app/_landing/legal-content.ts`, sections 2, 4, 5, 6 and 7).

Ported from translator's `lib/analytics.ts` (see its own `docs/analytics.md`
for the fuller history of this pipeline). This app has no accounts at all, so
unlike translator it never even has an own-domain session cookie to worry
about not riding along — every event here is anonymous by construction.

## How it works

1. The client (`lib/analytics.ts`) batches events and POSTs them as
   `text/plain` to `https://e.iq-mermaid.com/e` (CORS-simple, so
   `navigator.sendBeacon` can carry it during page teardown). `/e` is not a
   route in this app — it is iq-metrix's own public, browser-facing endpoint
   (`src/routes/public-e.ts` in that repo), reached over its own subdomain.
2. iq-metrix resolves which site/app the call belongs to from the request's
   `Origin` header against a fixed table (`iq-mermaid.com` /
   `www.iq-mermaid.com` → site `iq-mermaid`, app `web`) — never from a
   client-supplied field, so nothing on this domain can forge traffic into
   another product's numbers.
3. iq-metrix hashes the request into a visit (salted, rotated daily),
   applies attribution (`from`/`ref`/`theme`) and stores the event, then
   answers with `{ v: tok }` — a visit-continuation token the client echoes
   on its next batch so a device-hash flap mid-visit does not start a new
   visit.

There is no server-side relay in this app (unlike translator's
`app/api/e/route.ts` + `lib/analytics/ingest.ts`, kept there for its one
server-fired event, Google sign-in) — this app has nothing that can only be
tracked from the server, so the client talks to iq-metrix directly and
nothing else is needed.

## Event shape

`page` / `action` / `name` — short English labels, free-form, validated
client-side before sending and again server-side. **Names must not vary by
language**, or one funnel becomes thirty: locale-stable route keys and
language codes, never a translated label. `locale` rides along per event.

Pages: `Home`, `App`, `Legal`, `Blog`, `Blog article`.

## Sections

The scroll tracker names each scroll after the section the page settled on. A
section is any element with `data-section` — set it through `<Band section="…">`
(`app/_landing/shell.tsx`) and give the token a label in
`lib/track-sections.ts`, otherwise the timeline reads like a database dump.

## Env

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_ANALYTICS_DEV` | `1` makes the client send from `next dev` instead of logging to the console |

No shared secret is needed here — this app never calls iq-metrix's
service-to-service `/ingest` route, only its public `/e` one.
