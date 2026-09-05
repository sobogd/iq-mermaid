// JSON-LD builders, shared by the home / app / blog templates so all three
// describe the same entity instead of three slightly different ones.
import { BRAND, SITE_URL } from "./site";
import { localePath } from "./locale-paths";
import { OG_LOCALES } from "./og-locales";

const ORG_ID = `${SITE_URL}/#organization`;
const APP_ID = `${SITE_URL}/#app`;

export function organizationLd() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BRAND,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/og.png`,
  };
}

export function webSiteLd(locale: string) {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND,
    inLanguage: (OG_LOCALES[locale] ?? "en_US").replace("_", "-"),
    publisher: { "@id": ORG_ID },
  };
}

// A single free Offer, not an AggregateOffer: the editor really is free with
// no paid tier behind it, so `price: 0` is the accurate description rather
// than the misleading one it would be on a freemium product.
export function softwareApplicationLd(description: string) {
  return {
    "@type": ["SoftwareApplication", "WebApplication"],
    "@id": APP_ID,
    name: BRAND,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Diagramming",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    // The /app route no longer exists — the editor is the shared background of
    // every page, so the home page is where the software actually lives.
    url: SITE_URL,
    description,
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}

export function faqPageLd(items: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** Breadcrumb trail that mirrors EXACTLY what the visitor sees on the page —
 *  the JSON-LD must match the visible trail, not a longer one starting at the
 *  hidden home page. `trail` is the visible sequence (position 1 is whatever
 *  the first visible crumb links to). */
export function breadcrumbLd(trail: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

export function blogPostingLd(
  locale: string,
  entry: { id: string; date: string; dateModified?: string },
  content: { h1: string; description: string },
) {
  return {
    "@type": "BlogPosting",
    headline: content.h1,
    description: content.description,
    // Same region-tagged BCP-47 form the WebSite node and og:locale use, so a
    // single document never describes its own language two different ways.
    inLanguage: (OG_LOCALES[locale] ?? "en_US").replace("_", "-"),
    datePublished: entry.date,
    dateModified: entry.dateModified ?? entry.date,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    image: `${SITE_URL}/og.png`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${localePath(locale, `blog/${entry.id}`)}`,
    },
  };
}

// One <script> per page: a @graph keeps the nodes cross-referenced by @id
// instead of repeating the organization in every block.
export function graphLd(nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
