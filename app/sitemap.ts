import type { MetadataRoute } from "next";
import { localeHome, localePath } from "@/lib/locale-paths";
import { blogAlternates, homeAlternates, legalAlternates } from "@/lib/hreflang";
import { BLOG_ARTICLES } from "@/app/_landing/blog/registry";
import { READY_LOCALES } from "@/content";
import { SITE_URL } from "@/lib/site";
import LAST_MODIFIED from "@/content/last-modified.json";

// Real commit dates, not `new Date()` and not a hand-bumped constant:
// content/last-modified.json is regenerated from git history on every build by
// scripts/gen-lastmod.mjs. A constant nobody remembers to bump is exactly the
// synthetic freshness signal search engines learn to ignore.
//
// The fallback only applies to a key the generator has never seen (a brand new
// file in a build with no git history).
const FALLBACK_LAST_MODIFIED = "2026-09-03";
const DATES: Record<string, string> = LAST_MODIFIED;
const lastMod = (key: string) => DATES[key] ?? FALLBACK_LAST_MODIFIED;

// Same form as the canonical tags: the English home is SITE_URL with no
// trailing slash, so the sitemap must not advertise a second, slashed variant.
const url = (locale: string, slug?: string) =>
  slug ? `${SITE_URL}${localePath(locale, slug)}` : `${SITE_URL}${localeHome(locale)}`.replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const homeLanguages = homeAlternates();
  const homeEntries: MetadataRoute.Sitemap = READY_LOCALES.map((locale) => ({
    url: url(locale),
    lastModified: lastMod(`home:${locale}`),
    changeFrequency: "weekly",
    priority: locale === "en" ? 1 : 0.9,
    alternates: { languages: homeLanguages },
  }));

  // The editor is no longer a separate /app route — it is the shared
  // background under the window on every page, so it has no sitemap entries of
  // its own; the landing homes already cover it.

  const blogIndexLanguages = blogAlternates();
  const blogIndexEntries: MetadataRoute.Sitemap = READY_LOCALES.map((locale) => ({
    url: url(locale, "blog"),
    lastModified: lastMod("blog:index"),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: { languages: blogIndexLanguages },
  }));

  const articleEntries: MetadataRoute.Sitemap = BLOG_ARTICLES.flatMap((a) => {
    const languages = blogAlternates(a.id);
    return READY_LOCALES.map((locale) => ({
      url: url(locale, `blog/${a.id}`),
      lastModified: lastMod(`blog:${locale}/${a.id}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages },
    }));
  });

  // Legal documents ship under the same slug in every locale (/privacy,
  // /terms, /<locale>/privacy, /<locale>/terms) — the body is English, the
  // chrome is localized.
  const legalEntries: MetadataRoute.Sitemap = ["privacy", "terms"].flatMap((slug) => {
    const languages = legalAlternates(slug as "privacy" | "terms");
    return READY_LOCALES.map((locale) => ({
      url: url(locale, slug),
      lastModified: lastMod("legal"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
      alternates: { languages },
    }));
  });

  return [...homeEntries, ...blogIndexEntries, ...articleEntries, ...legalEntries];
}
