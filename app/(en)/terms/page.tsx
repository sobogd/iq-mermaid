import type { Metadata } from "next";
import { LegalPage } from "../../_landing/LegalPage";
import { OPERATOR, TERMS_SECTIONS, TERMS_TITLE } from "../../_landing/legal-content";
import { legalAlternates } from "@/lib/hreflang";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";

export const metadata: Metadata = {
  title: `${TERMS_TITLE} | IQ Mermaid`,
  description:
    "The rules for using the free IQ Mermaid editor: what the service is, what happens to your diagrams, acceptable use, and the limits of our liability.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}/terms`, languages: legalAlternates("terms") },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/terms`,
    siteName: OPERATOR.brand,
    locale: "en_US",
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

export default function TermsPage() {
  return <LegalPage title={TERMS_TITLE} sections={TERMS_SECTIONS} />;
}
