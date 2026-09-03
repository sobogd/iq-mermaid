import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
import { localePath } from "@/lib/locale-paths";
import { blogAlternates } from "@/lib/hreflang";
import { OG_LOCALES } from "@/lib/og-locales";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, READY_LOCALES } from "@/content";
import { BlogIndexView } from "@/app/_landing/blog/BlogIndexView";
import { blogIndexCards } from "@/app/_landing/blog/registry";
import { breadcrumbLd, graphLd, organizationLd, webSiteLd } from "@/lib/structured-data";

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
  const url = `${SITE_URL}${localePath(seg, "blog")}`;
  return {
    title: texts.blog.metaTitle,
    description: texts.blog.metaDescription,
    alternates: { canonical: url, languages: blogAlternates() },
    openGraph: {
      type: "website",
      url,
      siteName: texts.footer.brand,
      locale: OG_LOCALES[seg],
      title: texts.blog.metaTitle,
      description: texts.blog.metaDescription,
      images: [OG_IMAGE],
    },
    twitter: { ...TWITTER_CARD, title: texts.blog.metaTitle, description: texts.blog.metaDescription },
  };
}

export default async function LocaleBlogIndexPage({ params }: { params: Promise<{ seg: string }> }) {
  const { seg } = await params;
  if (!isReadyLocale(seg)) notFound();
  const texts = CHROME[seg];
  const jsonLd = graphLd([
    organizationLd(),
    webSiteLd(seg),
    breadcrumbLd(seg, [{ name: texts.blog.title, url: `${SITE_URL}${localePath(seg, "blog")}` }]),
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogIndexView locale={seg} texts={texts} cards={blogIndexCards(seg)} />
    </>
  );
}
