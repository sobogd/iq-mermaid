import { Header } from "./Header";
import { Footer, productLinksFor } from "./Footer";
import { PageTracker } from "./PageTracker";
import { Hero } from "./Hero";
import { StatCards } from "./StatCards";
import { Spotlights } from "./Spotlights";
import { Comparison } from "./Comparison";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Container, Band, PAGE } from "./shell";
import { localeHome, localePath } from "@/lib/locale-paths";
import type { Locale } from "@/lib/locales";
import { faqPageLd, graphLd, organizationLd, softwareApplicationLd, webSiteLd } from "@/lib/structured-data";
import type { SiteTexts } from "./types";

export function Landing({ locale, texts }: { locale: Locale; texts: SiteTexts }) {
  const homeHref = localeHome(locale);
  const appHref = localePath(locale, "app");
  const jsonLd = graphLd([
    organizationLd(),
    webSiteLd(locale),
    softwareApplicationLd(texts.meta.description),
    faqPageLd(texts.faq.items),
  ]);

  return (
    <main className={PAGE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header homeHref={homeHref} locale={locale} texts={texts.header} />
      <Container>
        <Band section="hero">
          <Hero texts={texts.hero} appHref={appHref} />
        </Band>
        <Band section="stats">
          <StatCards items={texts.statCards} />
        </Band>
        <Band id="features" section="features">
          <Spotlights items={texts.spotlights} />
        </Band>
        <Band id="comparison" section="comparison">
          <Comparison texts={texts.comparison} />
        </Band>
        <Band id="faq" section="faq">
          <Faq
            heading={texts.faq.heading}
            headingAccent={texts.faq.headingAccent}
            sub={texts.faq.sub}
            items={texts.faq.items}
          />
        </Band>
        <Band section="final_cta">
          <FinalCta
            heading={texts.finalCta.heading}
            headingAccent={texts.finalCta.headingAccent}
            sub={texts.finalCta.sub}
            ctaLabel={texts.finalCta.ctaLabel}
            ctaHref={appHref}
          />
        </Band>
      </Container>
      <Footer
        locale={locale}
        pathname={homeHref}
        texts={texts.footer}
        productLinks={productLinksFor(locale, { editor: texts.header.openEditor, blog: texts.header.blog })}
      />
      <PageTracker page="Home" />
    </main>
  );
}
