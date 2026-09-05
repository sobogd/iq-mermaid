import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticleView } from "@/app/_landing/blog/BlogArticleView";
import { BLOG_ARTICLES, blogArticle, blogEntry, blogRelated } from "@/app/_landing/blog/registry";
import { plain } from "@/app/_landing/blog/inline";
import { blogAlternates } from "@/lib/hreflang";
import { blogPostingLd, breadcrumbLd, faqPageLd, graphLd, organizationLd } from "@/lib/structured-data";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME } from "@/content";

export const dynamicParams = false;

const texts = CHROME.en;

export function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = blogArticle(slug, "en");
  if (!content) return {};
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: { canonical: url, languages: blogAlternates(slug) },
    openGraph: {
      type: "article",
      url,
      siteName: texts.footer.brand,
      locale: "en_US",
      title: content.meta.title,
      description: content.meta.description,
      images: [OG_IMAGE],
    },
    twitter: { ...TWITTER_CARD, title: content.meta.title, description: content.meta.description },
  };
}

export default async function EnBlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = blogEntry(slug);
  const content = blogArticle(slug, "en");
  if (!entry || !content) notFound();

  const faq = content.blocks.find((b) => b.type === "faq");
  const jsonLd = graphLd([
    organizationLd(),
    blogPostingLd("en", entry, { h1: plain(content.h1), description: content.meta.description }),
    breadcrumbLd([
      { name: texts.blog.title, url: `${SITE_URL}/blog` },
      { name: content.card.title, url: `${SITE_URL}/blog/${slug}` },
    ]),
    ...(faq && faq.type === "faq" ? [faqPageLd(faq.items)] : []),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogArticleView
        locale="en"
        texts={texts}
        entry={entry}
        content={content}
        related={blogRelated("en", slug)}
      />
    </>
  );
}
