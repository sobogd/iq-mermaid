import type { Metadata } from "next";
import { LegalPage } from "../../_landing/LegalPage";
import { OPERATOR, PRIVACY_SECTIONS, PRIVACY_TITLE } from "../../_landing/legal-content";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";

export const metadata: Metadata = {
  title: `${PRIVACY_TITLE} | IQ Mermaid`,
  description:
    "What IQ Mermaid collects and what it does not: no account, no analytics, and diagrams that never leave your browser. Server logs, retention and your GDPR rights.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/privacy`,
    siteName: OPERATOR.brand,
    locale: "en_US",
    title: PRIVACY_TITLE,
    description: "No account, no analytics, and diagrams that never leave your browser. What we do log, and for how long.",
    images: [OG_IMAGE],
  },
  twitter: {
    ...TWITTER_CARD,
    title: PRIVACY_TITLE,
    description: "No account, no analytics, and diagrams that never leave your browser. What we do log, and for how long.",
  },
};

export default function PrivacyPage() {
  return <LegalPage title={PRIVACY_TITLE} sections={PRIVACY_SECTIONS} pathname="/privacy" />;
}
