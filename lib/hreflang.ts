// Head-level hreflang alternates. Every cluster on this site (home, /blog,
// /blog/<id>) exists in exactly the shipped locales under the same slug, so
// one helper covers all of them.
import { locales } from "./locales";
import { localeHome, localePath } from "./locale-paths";
import { SITE_URL } from "./site";
import { READY_LOCALES } from "@/content";

/** Alternates for a path that exists in every shipped locale.
 *  `slug` omitted = the locale home. */
export function alternatesFor(slug?: string): Record<string, string> {
  const url = (locale: string) =>
    slug ? `${SITE_URL}${localePath(locale, slug)}` : `${SITE_URL}${localeHome(locale)}`.replace(/\/$/, "");
  const languages: Record<string, string> = { "x-default": url("en") };
  locales.forEach((locale) => {
    if (READY_LOCALES.includes(locale)) languages[locale] = url(locale);
  });
  return languages;
}

export const homeAlternates = () => alternatesFor();
export const blogAlternates = (id?: string) => alternatesFor(id ? `blog/${id}` : "blog");
/** Alternates for a legal document that ships under the same slug in every
 *  locale (/privacy, /terms), with the English version at the root. */
export const legalAlternates = (slug: "privacy" | "terms") => alternatesFor(slug);
