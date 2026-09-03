import { locales } from "./locales";

export const localeHome = (locale: string): string => (locale === "en" ? "/" : `/${locale}`);

export const localePath = (locale: string, slug: string): string => {
  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  return locale === "en" ? normalized : `/${locale}${normalized}`;
};

// Locale switcher href. Every localized route here has a locale-stable slug
// (/app, /blog, /blog/<id> — blog ids are the English slug in every locale),
// so switching is a pure prefix swap. The English-only legal pages are the
// one exception and fall back to the target locale's home rather than
// advertising a path that does not exist there.
const LOCALIZED_PREFIXES = ["app", "blog"];

export function swapLocale(pathname: string, target: string): string {
  const seg = pathname.split("/").filter(Boolean);
  const hasLocale = seg.length > 0 && (locales as readonly string[]).includes(seg[0]);
  const rest = hasLocale ? seg.slice(1) : seg;
  if (rest.length === 0) return localeHome(target);
  if (!LOCALIZED_PREFIXES.includes(rest[0])) return localeHome(target);
  return localePath(target, rest.join("/"));
}
