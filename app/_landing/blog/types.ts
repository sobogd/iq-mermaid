// Blog content model. Every article is a per-locale JSON file at
// content/blog/<id>/<locale>.json (same block structure in every locale — only
// strings differ), listed in content/blog/manifest.json. The block union keeps
// layout decisions in code and text in JSON, so a translation can never break
// the markup. Inline strings support a markdown-lite syntax handled by
// inline.tsx: [label](app:) link to the editor, [label](blog:some-slug)
// cross-article link, [label](https://…) external link, **bold**, `code`.

export type BlogBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "tip"; text: string }
  | { type: "note"; text: string }
  /** A mermaid source listing. Rendered as plain, copyable code — never
   *  executed at build time, so a broken snippet cannot fail a build. */
  | { type: "code"; caption?: string; code: string }
  | { type: "cta"; heading: string; text: string; buttonLabel: string }
  | { type: "faq"; heading: string; items: { q: string; a: string }[] };

export type BlogArticleContent = {
  meta: {
    /** <title>, <=60 chars, keyword first. */
    title: string;
    /** Meta description, <=155 chars. */
    description: string;
  };
  /** Copy for the card on the blog index page. */
  card: {
    title: string;
    excerpt: string;
  };
  h1: string;
  intro: string;
  blocks: BlogBlock[];
};

export type BlogManifestEntry = {
  /** URL slug (English, shared across every locale) = content/blog/<id>/. */
  id: string;
  /** Publication date, YYYY-MM-DD. Drives ordering + datePublished. */
  date: string;
  /** Set ONLY on a real content revision (fake freshness hurts rankings). */
  dateModified?: string;
};
