import { DesktopShell } from "./desktop/DesktopShell";
import { PageTracker } from "./PageTracker";
import { Hero } from "./Hero";
import { StatCards } from "./StatCards";
import { Spotlights } from "./Spotlights";
import { Comparison } from "./Comparison";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Band } from "./shell";
import { localeHome } from "@/lib/locale-paths";
import type { Locale } from "@/lib/locales";
import { faqPageLd, graphLd, organizationLd, softwareApplicationLd, webSiteLd } from "@/lib/structured-data";
import type { SiteTexts } from "./types";

export function Landing({ locale, texts }: { locale: Locale; texts: SiteTexts }) {
  const homeHref = localeHome(locale);
  const jsonLd = graphLd([
    organizationLd(),
    webSiteLd(locale),
    softwareApplicationLd(texts.meta.description),
    faqPageLd(texts.faq.items),
  ]);

  return (
    <main className="pointer-events-none relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DesktopShell
        locale={locale}
        homeHref={homeHref}
        headerTexts={texts.header}
        showBrand
      >
        {/* The page is one running column of type: each section is a plain
            <section> that shares the brand row's side padding and spaces itself
            with vertical padding only — no extra wrappers, no cards. */}
        <Band section="hero" className="px-6 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
          <Hero texts={texts.hero} />
        </Band>

        <Band section="stats" className="px-6 pb-12 sm:px-8 sm:pb-16">
          <StatCards items={texts.statCards} />
        </Band>

        <Band id="features" section="features" className="px-6 pb-12 sm:px-8 sm:pb-16">
          <Spotlights items={texts.spotlights} />
        </Band>

        <Band id="comparison" section="comparison" className="px-6 pb-12 sm:px-8 sm:pb-16">
          <Comparison texts={texts.comparison} />
        </Band>

        <Band id="faq" section="faq" className="px-6 pb-12 sm:px-8 sm:pb-16">
          <Faq
            heading={texts.faq.heading}
            headingAccent={texts.faq.headingAccent}
            sub={texts.faq.sub}
            items={texts.faq.items}
          />
        </Band>

        <Band section="final_cta" className="px-6 pb-16 sm:px-8 sm:pb-24">
          <FinalCta heading={texts.finalCta.heading} headingAccent={texts.finalCta.headingAccent} sub={texts.finalCta.sub} />
        </Band>
      </DesktopShell>
      <PageTracker page="Home" />
    </main>
  );
}
