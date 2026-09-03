import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
import { localeHome, localePath } from "@/lib/locale-paths";
import { appAlternates } from "@/lib/hreflang";
import { OG_LOCALES } from "@/lib/og-locales";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, EDITOR, READY_LOCALES } from "@/content";
import { EditorClient } from "@/app/_editor/EditorClient";

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
  const url = `${SITE_URL}${localePath(seg, "app")}`;
  return {
    title: texts.app.metaTitle,
    description: texts.app.metaDescription,
    alternates: { canonical: url, languages: appAlternates() },
    openGraph: {
      type: "website",
      url,
      siteName: texts.footer.brand,
      locale: OG_LOCALES[seg],
      title: texts.app.metaTitle,
      description: texts.app.metaDescription,
      images: [OG_IMAGE],
    },
    twitter: { ...TWITTER_CARD, title: texts.app.metaTitle, description: texts.app.metaDescription },
  };
}

export default async function LocaleAppPage({ params }: { params: Promise<{ seg: string }> }) {
  const { seg } = await params;
  if (!isReadyLocale(seg)) notFound();
  return <EditorClient t={EDITOR[seg]} homeHref={localeHome(seg)} brand={CHROME[seg].footer.brand} />;
}
