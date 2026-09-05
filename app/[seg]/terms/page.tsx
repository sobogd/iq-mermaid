import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
import { localeHome, localePath } from "@/lib/locale-paths";
import { legalAlternates } from "@/lib/hreflang";
import { OG_LOCALES } from "@/lib/og-locales";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, READY_LOCALES } from "@/content";
import { LegalPage } from "../../_landing/LegalPage";
import { TERMS_SECTIONS, TERMS_TITLE } from "../../_landing/legal-content";

// Terms page of every locale except English (which keeps /terms). The chrome
// is localized; the legal text itself stays the English binding copy.
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
  const url = `${SITE_URL}${localePath(seg, "terms")}`;
  return {
    title: `${TERMS_TITLE} | ${texts.footer.brand}`,
    description:
      "The rules for using the free IQ Mermaid editor: what the service is, what happens to your diagrams, acceptable use, and the limits of our liability.",
    alternates: { canonical: url, languages: legalAlternates("terms") },
    openGraph: {
      type: "website",
      url,
      siteName: texts.footer.brand,
      locale: OG_LOCALES[seg],
      title: TERMS_TITLE,
      description: "What the free editor is, what happens to your diagrams, acceptable use, and the limits of our liability.",
      images: [OG_IMAGE],
    },
    twitter: {
      ...TWITTER_CARD,
      title: TERMS_TITLE,
      description: "What the free editor is, what happens to your diagrams, acceptable use, and the limits of our liability.",
    },
  };
}

export default async function LocaleTermsPage({ params }: { params: Promise<{ seg: string }> }) {
  const { seg } = await params;
  if (!isReadyLocale(seg)) notFound();
  const texts = CHROME[seg];
  return (
    <LegalPage
      title={TERMS_TITLE}
      sections={TERMS_SECTIONS}
     
      texts={texts}
      locale={seg}
      homeHref={localeHome(seg)}
    />
  );
}
