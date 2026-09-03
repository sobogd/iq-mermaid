// Human labels for the `data-section` hooks the scroll tracker reads.
//
// The tokens are DOM hooks first ("final_cta", "blog-list"); the raw slug
// means nothing to whoever reads a visit timeline, so each one gets a label
// here. Ported from translator's lib/track-sections.ts, matching the
// `section=` values actually set via <Band> in app/_landing/**.

const SECTION_LABEL: Record<string, string> = {
  hero: "Hero",
  stats: "Trust stats",
  features: "Features",
  comparison: "Comparison",
  faq: "FAQ",
  final_cta: "Final CTA",
  legal: "Legal text",
  footer: "Footer",
  "blog-intro": "Blog intro",
  "blog-list": "Blog list",
  "blog-article": "Blog article",
  "blog-related": "Blog related",
  "blog-cta": "Blog CTA",
};

/** Separators to spaces, first letter up — an unmapped token still reads like a
 *  label instead of like a database key. */
function humanize(token: string): string {
  const words = token.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

export function sectionLabel(raw: string): string {
  return SECTION_LABEL[raw] || humanize(raw) || "Section";
}
