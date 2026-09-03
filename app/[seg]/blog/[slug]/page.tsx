import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
import { localePath } from "@/lib/locale-paths";
import { blogAlternates } from "@/lib/hreflang";
import { OG_LOCALES } from "@/lib/og-locales";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, READY_LOCALES } from "@/content";
import { BlogArticleView } from "@/app/_landing/blog/BlogArticleView";
import { BLOG_ARTICLES, blogArticle, blogEntry, blogRelated } from "@/app/_landing/blog/registry";
import { plain } from "@/app/_landing/blog/inline";
import { blogPostingLd, breadcrumbLd, faqPageLd, graphLd, organizationLd } from "@/lib/structured-data";

export const dynamicParams = false;

const isReadyLocale = (seg: string): seg is Locale =>
  seg !== "en" && (locales as readonly string[]).includes(seg) && READY_LOCALES.includes(seg);

export function generateStaticParams() {
  return READY_LOCALES.filter((l) => l !== "en").flatMap((seg) =>
    BLOG_ARTICLES.map((a) => ({ seg, slug: a.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seg: string; slug: string }>;
}): Promise<Metadata> {
  const { seg, slug } = await params;
  if (!isReadyLocale(seg)) return {};
  const content = blogArticle(slug, seg);
  if (!content) return {};
  const url = `${SITE_URL}${localePath(seg, `blog/${slug}`)}`;
  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: { canonical: url, languages: blogAlternates(slug) },
    openGraph: {
      type: "article",
      url,
      siteName: CHROME[seg].footer.brand,
      locale: OG_LOCALES[seg],
      title: content.meta.title,
      description: content.meta.description,
      images: [OG_IMAGE],
    },
    twitter: { ...TWITTER_CARD, title: content.meta.title, description: content.meta.description },
  };
}

export default async function LocaleBlogArticlePage({
  params,
}: {
  params: Promise<{ seg: string; slug: string }>;
}) {
  const { seg, slug } = await params;
  if (!isReadyLocale(seg)) notFound();
  const entry = blogEntry(slug);
  const content = blogArticle(slug, seg);
  if (!entry || !content) notFound();
  const texts = CHROME[seg];

  const faq = content.blocks.find((b) => b.type === "faq");
  const jsonLd = graphLd([
    organizationLd(),
    blogPostingLd(seg, entry, { h1: plain(content.h1), description: content.meta.description }),
    breadcrumbLd(seg, [
      { name: texts.blog.title, url: `${SITE_URL}${localePath(seg, "blog")}` },
      { name: content.card.title, url: `${SITE_URL}${localePath(seg, `blog/${slug}`)}` },
    ]),
    ...(faq && faq.type === "faq" ? [faqPageLd(faq.items)] : []),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogArticleView
        locale={seg}
        texts={texts}
        entry={entry}
        content={content}
        related={blogRelated(seg, slug)}
      />
    </>
  );
}
