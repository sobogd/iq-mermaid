import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
import { localeHome } from "@/lib/locale-paths";
import { homeAlternates } from "@/lib/hreflang";
import { OG_LOCALES } from "@/lib/og-locales";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, READY_LOCALES } from "@/content";
import { Landing } from "../_landing/Landing";

// Home page of every locale except English, which keeps its static route at
// the root (app/(en)/page.tsx).
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
  const url = `${SITE_URL}${localeHome(seg)}`;
  return {
    title: texts.meta.title,
    description: texts.meta.description,
    alternates: { canonical: url, languages: homeAlternates() },
    openGraph: {
      type: "website",
      url,
      siteName: texts.footer.brand,
      locale: OG_LOCALES[seg],
      title: texts.meta.ogTitle,
      description: texts.meta.ogDescription,
      images: [OG_IMAGE],
    },
    twitter: {
      ...TWITTER_CARD,
      title: texts.meta.twitterTitle,
      description: texts.meta.twitterDescription,
    },
  };
}

export default async function LocaleHomePage({ params }: { params: Promise<{ seg: string }> }) {
  const { seg } = await params;
  if (!isReadyLocale(seg)) notFound();
  return <Landing locale={seg} texts={CHROME[seg]} />;
}
