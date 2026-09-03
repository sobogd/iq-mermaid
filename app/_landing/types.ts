export type SpotlightBullet = { title: string; sub: string };
export type Spotlight = { heading: string; sub: string; bullets: SpotlightBullet[] };
export type StatCard = { title: string; sub: string };
export type ComparisonRow = { title: string; us: string; them: string };
export type FaqItem = { q: string; a: string };

// UI strings of the blog templates (index + article), per locale.
export interface BlogTexts {
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  readMore: string;
  backToBlog: string;
  relatedHeading: string;
}

// Everything the marketing pages of one locale render. One file per locale in
// content/chrome/<locale>.json; the English file is the master whose key tree
// scripts/validate-content.mjs enforces on the other 33.
export interface SiteTexts {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    twitterTitle: string;
    twitterDescription: string;
  };
  header: {
    /** Word rendered next to the logo mark, which already says "IQ". */
    logo: string;
    features: string;
    blog: string;
    faq: string;
    openEditor: string;
    menu: string;
  };
  hero: {
    badgeFree: string;
    badgeNoSignup: string;
    badgeDiagrams: string;
    title: string;
    titleAccent: string;
    description: string;
    ctaOpen: string;
    ctaLearn: string;
    /** Labels of the two-pane preview card (code on the left, diagram right). */
    mockCodeLabel: string;
    mockDiagramLabel: string;
  };
  statCards: StatCard[];
  spotlights: Spotlight[];
  comparison: {
    title: string;
    titleAccent: string;
    description: string;
    usLabel: string;
    themLabel: string;
    rows: ComparisonRow[];
  };
  faq: {
    heading: string;
    headingAccent: string;
    sub: string;
    items: FaqItem[];
  };
  finalCta: {
    heading: string;
    headingAccent: string;
    sub: string;
    ctaLabel: string;
  };
  footer: {
    tagline: string;
    brand: string;
    linksHeading: string;
    languagesHeading: string;
  };
  /** Metadata of the /app page — the editor itself carries no marketing copy. */
  app: {
    metaTitle: string;
    metaDescription: string;
    backToSite: string;
  };
  blog: BlogTexts;
}
