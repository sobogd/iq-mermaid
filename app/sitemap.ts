import type { MetadataRoute } from "next";
import { localeHome, localePath } from "@/lib/locale-paths";
import { appAlternates, blogAlternates, homeAlternates } from "@/lib/hreflang";
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

  // The editor is the product; it outranks the marketing copy in importance
  // even though it carries almost no crawlable text.
  const appLanguages = appAlternates();
  const appEntries: MetadataRoute.Sitemap = READY_LOCALES.map((locale) => ({
    url: url(locale, "app"),
    lastModified: lastMod(`editor:${locale}`),
    changeFrequency: "monthly",
    priority: 0.9,
    alternates: { languages: appLanguages },
  }));

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

  // English-only legal pages (app/(en)/privacy, app/(en)/terms).
  const legalEntries: MetadataRoute.Sitemap = ["privacy", "terms"].map((slug) => ({
    url: url("en", slug),
    lastModified: lastMod("legal"),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...homeEntries, ...appEntries, ...blogIndexEntries, ...articleEntries, ...legalEntries];
}
