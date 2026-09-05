import type { Metadata } from "next";
import { LegalPage } from "../../_landing/LegalPage";
import { OPERATOR, PRIVACY_SECTIONS, PRIVACY_TITLE } from "../../_landing/legal-content";
import { legalAlternates } from "@/lib/hreflang";
import { OG_IMAGE, SITE_URL, TWITTER_CARD } from "@/lib/site";

export const metadata: Metadata = {
  title: `${PRIVACY_TITLE} | IQ Mermaid`,
  description: "What IQ Mermaid collects and what it does not: sign-in is email-only, analytics are our own and cookieless, and your diagrams are saved to your account. Server logs, retention and your GDPR rights.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}/privacy`, languages: legalAlternates("privacy") },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/privacy`,
    siteName: OPERATOR.brand,
    locale: "en_US",
    title: PRIVACY_TITLE,
    description: "Email-only sign-in, our own cookieless analytics and diagrams saved to your account. What we log, retention and your GDPR rights.",
    images: [OG_IMAGE],
  },
  twitter: {
    ...TWITTER_CARD,
    title: PRIVACY_TITLE,
    description: "Email-only sign-in, our own cookieless analytics and diagrams saved to your account. What we log, retention and your GDPR rights.",
  },
};

export default function PrivacyPage() {
  return <LegalPage title={PRIVACY_TITLE} sections={PRIVACY_SECTIONS} />;
}
