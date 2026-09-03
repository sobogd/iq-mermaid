import { NARROW } from "./shell";
import { defaultLocale, type Locale } from "@/lib/locales";
import { localePath, swapLocale } from "@/lib/locale-paths";
import { LOCALE_NAMES } from "@/lib/locale-names";
import { READY_LOCALES } from "@/content";
import { TrackedLink } from "./TrackedLink";

export type FooterTexts = {
  tagline: string;
  brand: string;
  linksHeading: string;
  languagesHeading: string;
};

const DEFAULT_TEXTS: FooterTexts = {
  tagline: "Free online mermaid editor",
  brand: "IQ Mermaid",
  linksHeading: "Product",
  languagesHeading: "Languages",
};

// Same label style as iq-rest's landing footer — uppercase, muted, tracked-out.
const SECTION_HEADING = "text-xs font-semibold uppercase tracking-wide text-hint";

export function Footer({
  locale = defaultLocale,
  pathname = "/",
  texts = DEFAULT_TEXTS,
  productLinks = [],
}: {
  locale?: Locale;
  pathname?: string;
  texts?: FooterTexts;
  /** Editor + blog, labelled in the page's own language. `key` is the
   *  locale-stable analytics label. */
  productLinks?: { href: string; label: string; key: string }[];
}) {
  return (
    <footer data-section="footer" className="border-t border-border py-8">
      <div className={`${NARROW} flex flex-col gap-6`}>
        {productLinks.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className={SECTION_HEADING}>{texts.linksHeading}</p>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              {productLinks.map((l) =>
                l.href === pathname ? (
                  <span key={l.href} className="text-sm font-semibold text-text">
                    {l.label}
                  </span>
                ) : (
                  <TrackedLink
                    key={l.href}
                    href={l.href}
                    track={`Footer ${l.key}`}
                    className="text-sm text-hint transition-colors hover:text-text"
                  >
                    {l.label}
                  </TrackedLink>
                ),
              )}
            </nav>
          </div>
        )}
        {/* Locale switcher: the same page in every shipped locale (or that
            locale's home when the current path has no translation). Doubles as
            internal linking to the localized homes. */}
        <div className="flex flex-col gap-2">
          <p className={SECTION_HEADING}>{texts.languagesHeading}</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            {READY_LOCALES.map((l) =>
              l === locale ? (
                <span key={l} className="text-sm font-semibold text-text">
                  {LOCALE_NAMES[l] ?? l}
                </span>
              ) : (
                <TrackedLink
                  key={l}
                  href={swapLocale(pathname, l)}
                  track={`Footer language ${l}`}
                  className="text-sm text-hint transition-colors hover:text-text"
                >
                  {LOCALE_NAMES[l] ?? l}
                </TrackedLink>
              ),
            )}
          </nav>
        </div>
        {/* Legal pages are English-only (see app/_landing/legal-content.ts),
            so their labels are too — every locale links to the same two. */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-sm text-hint sm:flex-row">
          <span>{`© ${new Date().getFullYear()} ${texts.brand}`}</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <TrackedLink href="/privacy" track="Footer privacy" className="transition-colors hover:text-text">
              Privacy
            </TrackedLink>
            <TrackedLink href="/terms" track="Footer terms" className="transition-colors hover:text-text">
              Terms
            </TrackedLink>
          </nav>
          <span>{texts.tagline}</span>
        </div>
      </div>
    </footer>
  );
}

/** The two product links every page's footer carries, in the page's language. */
export function productLinksFor(
  locale: Locale,
  labels: { editor: string; blog: string },
): { href: string; label: string; key: string }[] {
  return [
    { href: localePath(locale, "app"), label: labels.editor, key: "editor" },
    { href: localePath(locale, "blog"), label: labels.blog, key: "blog" },
  ];
}
