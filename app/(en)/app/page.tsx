import type { Metadata } from "next";
import { EditorClient } from "@/app/_editor/EditorClient";
import { appAlternates } from "@/lib/hreflang";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";
import { CHROME, EDITOR } from "@/content";

const texts = CHROME.en;
const url = `${SITE_URL}/app`;

export const metadata: Metadata = {
  title: texts.app.metaTitle,
  description: texts.app.metaDescription,
  alternates: { canonical: url, languages: appAlternates() },
  openGraph: {
    type: "website",
    url,
    siteName: texts.footer.brand,
    locale: "en_US",
    title: texts.app.metaTitle,
    description: texts.app.metaDescription,
    images: [OG_IMAGE],
  },
  twitter: { ...TWITTER_CARD, title: texts.app.metaTitle, description: texts.app.metaDescription },
};

export default function EnAppPage() {
  return <EditorClient t={EDITOR.en} homeHref="/" />;
}
