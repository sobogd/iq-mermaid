import { DesktopShell } from "./desktop/DesktopShell";
import { Band } from "./shell";
import { PageTracker } from "./PageTracker";
import type { LegalSection } from "./legal-content";
import { CHROME } from "@/content";
import { defaultLocale, type Locale } from "@/lib/locales";
import type { SiteTexts } from "./types";

// A legal document (Privacy / Terms) as plain, semantic type — one column of
// <h1> / <section> / <h2> / <p> with no card, no border, no dividers. The page
// chrome is localized; the document itself is the English binding text, so the
// whole block keeps lang="en" / dir="ltr" whatever locale the page runs under.
export function LegalPage({
  title,
  sections,
  texts,
  locale = defaultLocale,
  homeHref,
}: {
  title: string;
  sections: LegalSection[];
  /** Locale chrome texts for the surrounding UI. Defaults to English. */
  texts?: SiteTexts;
  locale?: Locale;
  homeHref?: string;
}) {
  const chrome = texts ?? CHROME.en;
  const resolvedHome = homeHref ?? (locale === "en" ? "/" : `/${locale}`);
  const lastUpdated = sections
    .flatMap((s) => s.paragraphs)
    .find((p) => p.startsWith("Last updated:"));
  const body = sections
    .map((s) => ({ ...s, paragraphs: s.paragraphs.filter((p) => !p.startsWith("Last updated:")) }))
    .filter((s) => s.heading || s.paragraphs.length > 0);

  return (
    <>
      <DesktopShell
        locale={locale}
        homeHref={resolvedHome}
        headerTexts={chrome.header}
      >
        <Band section="legal" className="px-6 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-10">
          <div lang="en" dir="ltr" className="flex flex-col gap-y-10">
            <header className="flex flex-col items-start gap-3">
              <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
                {title}
              </h1>
              {lastUpdated && <p className="text-sm text-hint">{lastUpdated}</p>}
            </header>

            {body.map((section, i) => (
              <section key={section.heading ?? `intro-${i}`} className="flex flex-col gap-3">
                {section.heading && (
                  <h2 className="text-xl font-semibold leading-snug tracking-tight">{section.heading}</h2>
                )}
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-relaxed text-text/80">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Band>
      </DesktopShell>
      <PageTracker page="Legal" />
    </>
  );
}
