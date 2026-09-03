import type { Metadata } from "next";
import { BlogIndexView } from "@/app/_landing/blog/BlogIndexView";
import { blogIndexCards } from "@/app/_landing/blog/registry";
import { blogAlternates } from "@/lib/hreflang";
import { breadcrumbLd, graphLd, organizationLd, webSiteLd } from "@/lib/structured-data";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME } from "@/content";

const texts = CHROME.en;
const url = `${SITE_URL}/blog`;

export const metadata: Metadata = {
  title: texts.blog.metaTitle,
  description: texts.blog.metaDescription,
  alternates: { canonical: url, languages: blogAlternates() },
  openGraph: {
    type: "website",
    url,
    siteName: texts.footer.brand,
    locale: "en_US",
    title: texts.blog.metaTitle,
    description: texts.blog.metaDescription,
    images: [OG_IMAGE],
  },
  twitter: { ...TWITTER_CARD, title: texts.blog.metaTitle, description: texts.blog.metaDescription },
};

export default function EnBlogIndexPage() {
  const jsonLd = graphLd([
    organizationLd(),
    webSiteLd("en"),
    breadcrumbLd("en", [{ name: texts.blog.title, url }]),
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogIndexView locale="en" texts={texts} cards={blogIndexCards("en")} />
    </>
  );
}
