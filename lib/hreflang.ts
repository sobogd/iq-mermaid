// Head-level hreflang alternates. Every cluster on this site (home, /app,
// /blog, /blog/<id>) exists in exactly the shipped locales under the same
// slug, so one helper covers all of them.
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
export const appAlternates = () => alternatesFor("app");
export const blogAlternates = (id?: string) => alternatesFor(id ? `blog/${id}` : "blog");
