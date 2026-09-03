import type { Metadata } from "next";
import { Landing } from "../_landing/Landing";
import { homeAlternates } from "@/lib/hreflang";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME } from "@/content";

const texts = CHROME.en;

export const metadata: Metadata = {
  title: texts.meta.title,
  description: texts.meta.description,
  alternates: { canonical: SITE_URL, languages: homeAlternates() },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: texts.footer.brand,
    locale: "en_US",
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

export default function EnHomePage() {
  return <Landing locale="en" texts={texts} />;
}
