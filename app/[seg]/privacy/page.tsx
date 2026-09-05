import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
import { localeHome, localePath } from "@/lib/locale-paths";
import { legalAlternates } from "@/lib/hreflang";
import { OG_LOCALES } from "@/lib/og-locales";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, READY_LOCALES } from "@/content";
import { LegalPage } from "../../_landing/LegalPage";
import { PRIVACY_SECTIONS, PRIVACY_TITLE } from "../../_landing/legal-content";

// Privacy page of every locale except English (which keeps /privacy). The
// chrome is localized; the legal text itself stays the English binding copy.
export const dynamicParams = false;

const isReadyLocale = (seg: string): seg is Locale =>
  seg !== "en" && (locales as readonly string[]).includes(seg) && READY_LOCALES.includes(seg);

export function generateStaticParams() {
  return READY_LOCALES.filter((l) => l !== "en").map((seg) => ({ seg }));
}

export async function generateMetadata({ params }: { params: Promise<{ seg: string }> }): Promise<Metadata> {
  const { seg } = await params;
  if (!isReadyLocale(seg)) return {};
  const texts = CHROME[seg];
  const url = `${SITE_URL}${localePath(seg, "privacy")}`;
  return {
    title: `${PRIVACY_TITLE} | ${texts.footer.brand}`,
    description:
      "What IQ Mermaid collects and what it does not: no account, no analytics, and diagrams that never leave your browser. Server logs, retention and your GDPR rights.",
    alternates: { canonical: url, languages: legalAlternates("privacy") },
    openGraph: {
      type: "website",
      url,
      siteName: texts.footer.brand,
      locale: OG_LOCALES[seg],
      title: PRIVACY_TITLE,
      description: "No account, no analytics, and diagrams that never leave your browser. What we do log, and for how long.",
      images: [OG_IMAGE],
    },
    twitter: {
      ...TWITTER_CARD,
      title: PRIVACY_TITLE,
      description: "No account, no analytics, and diagrams that never leave your browser. What we do log, and for how long.",
    },
  };
}

export default async function LocalePrivacyPage({ params }: { params: Promise<{ seg: string }> }) {
  const { seg } = await params;
  if (!isReadyLocale(seg)) notFound();
  const texts = CHROME[seg];
  return (
    <LegalPage
      title={PRIVACY_TITLE}
      sections={PRIVACY_SECTIONS}
     
      texts={texts}
      locale={seg}
      homeHref={localeHome(seg)}
    />
  );
}
