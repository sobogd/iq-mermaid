# Localizing IQ Mermaid content

IQ Mermaid is a free online mermaid diagram editor at https://iq-mermaid.com.
Its copy lives in JSON, one file per locale, with English as the master. This
is the brief handed to whoever (or whatever) translates a locale.

Working directory: the repository root.

## What to produce

Copy each English master to the same path with the target locale code in place
of `en`:

1. `content/chrome/en.json` → `content/chrome/<loc>.json` — marketing copy
2. `content/editor/en.json` → `content/editor/<loc>.json` — editor UI strings
3. `content/blog/mermaid-syntax-cheat-sheet/en.json` → `.../<loc>.json`
4. `content/blog/mermaid-sequence-diagram/en.json` → `.../<loc>.json`
5. `content/blog/export-mermaid-to-png-svg/en.json` → `.../<loc>.json`

## Hard rules (a violation breaks the build)

- **Identical key tree.** Same keys, same nesting, same array lengths as the
  English file. Never add, drop, reorder or rename a key.
- **`code` blocks: copy the `code` string byte-for-byte.** Mermaid syntax and
  the node labels inside snippets stay exactly as in English — a translated
  keyword would not render. Only the `caption` beside a snippet is translated.
- **Inline code in backticks stays unchanged**: `` `A[Text]` ``,
  `` `flowchart TD` ``, `` `-->` ``. Translate the prose around it, never the
  token itself.
- **Markdown-lite links keep their target**: `[label](app:)`,
  `[label](blog:some-slug)`, `[label](https://…)` — translate the label, never
  the part in parentheses.
- **Do not translate**: "mermaid", "IQ Mermaid", "SVG", "PNG", "Markdown",
  "GitHub", "GitLab", "Notion", "Obsidian", "Docusaurus", "MkDocs",
  "VitePress", "JavaScript", "HTTPS", "GDPR" — product and format names
  generally.
- `meta.title` ≤ 65 characters, `meta.description` ≤ 165 characters, in every
  chrome and blog file. Count them; the validator rejects longer ones.
- Valid JSON, UTF-8, no trailing commas. Full orthography for the language,
  including every diacritic — never an ASCII substitute ("für", not "fur").

## Quality bar

- Translate for a native reader, not word by word. An idiomatic heading beats
  a faithful one.
- **SEO matters most in `meta.title`, `meta.description`,
  `hero.title`/`hero.titleAccent` and each article's `meta` and `card`
  fields.** Lead with the phrase a native speaker would actually type into
  Google when looking for a free online mermaid or diagram editor. Keep the
  word "mermaid" inside it: it is the product category and it is searched in
  English in every market.
- Table `headers` are translated; table cells that contain only code are not.
- FAQ answers should read like answers, not like translated marketing.
- The editor JSON is UI microcopy: short, imperative, fits on a button.
  `prompts.edgeLabel` ends with a colon; `prompts.clearAll` is a yes/no
  question; `hints.*` are one-line banners that end with the Esc-to-cancel
  clause.
- RTL locales (`fa`, `ar`) need no special markup — direction is handled by
  the layout. Write normal text.

## Verify

```bash
node scripts/validate-content.mjs <loc>
```

Must print a success line. Fix everything it reports and re-run until clean.
Touch no file outside the five listed above.
