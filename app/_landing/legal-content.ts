// Hardcoded English legal text for /privacy and /terms.
//
// Ported from iq-rest (apps/landing/components/cookie-consent/legal-text.tsx)
// via iq-translate: same operator, same hosting, same jurisdiction and the
// same section structure. The product-specific parts are rewritten, and this
// service processes far less than either of those two — there is no account,
// no payment and no server-side copy of anything you draw.
//
// Kept in TypeScript, not in the locale JSONs, for the same reason as there:
// translating legal documents needs lawyer review. The English version is
// canonical and binding.

export const OPERATOR = {
  legalName: "Bogdan Sokolov",
  status: "individual entrepreneur (autónomo) registered in Spain",
  brand: "IQ Mermaid",
  domain: "iq-mermaid.com",
  // The operator's existing support mailbox, shared across their brands.
  contactEmail: "support@iq-rest.com",
  fiscalAddress: "Calle Boca Del Rio 2, 1A, Oviedo, 33010, Asturias, Spain",
  taxId: "ESZ1894474S",
  hostingProvider: "Hetzner Online GmbH, Nuremberg, Germany",
};

export type LegalSection = { heading?: string; paragraphs: string[] };

export const PRIVACY_TITLE = "Privacy Policy";
export const TERMS_TITLE = "Terms of Service";
export const LEGAL_LAST_UPDATED = "September 3, 2026";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    paragraphs: [
      `Last updated: ${LEGAL_LAST_UPDATED}`,
      `This Privacy Policy explains how ${OPERATOR.brand} — a service operated by ${OPERATOR.legalName}, ${OPERATOR.status}, with fiscal address at ${OPERATOR.fiscalAddress} (Tax ID: ${OPERATOR.taxId}) ("${OPERATOR.brand}", "we", "us") — handles personal data when you use the diagram editor at ${OPERATOR.domain}.`,
      `The short version: there is no account, no sign-in and no payment, the diagrams you create never leave your browser, and we run no third-party analytics and no advertising trackers — the only usage measurement is our own, cookieless one, described below.`,
      `We comply with the General Data Protection Regulation (GDPR), the Spanish Organic Law on Data Protection and Guarantee of Digital Rights (LOPDGDD), and the ePrivacy Directive.`,
    ],
  },
  {
    heading: "1. Data Controller",
    paragraphs: [
      `${OPERATOR.legalName}, ${OPERATOR.status}.`,
      `Fiscal address: ${OPERATOR.fiscalAddress}. Tax ID: ${OPERATOR.taxId}.`,
      `Contact for any privacy matter: ${OPERATOR.contactEmail}.`,
    ],
  },
  {
    heading: "2. What we process",
    paragraphs: [
      `Server logs. Like any web server, ours records the request it answers: your IP address, the time, the page requested, the HTTP status, your browser's user-agent string and the referring page. These entries are what makes it possible to diagnose an outage and to detect abusive traffic.`,
      `Usage measurement — our own, cookieless. For each visit we store which pages were opened and which actions were taken (an event is a page, an action and a short English label such as "Home / Click / Header open editor"), the interface language, the device type and operating system, the browser's language header, the approximate location (country, region, city) derived from the IP address, and where the visit came from (a "?from=" campaign tag or the search engine that referred it). This is handled by a separate analytics service we also operate in the European Union, which your browser talks to directly rather than through this site's own server. The visit itself is identified by a salted hash of your IP address, browser user agent and language header, computed by that service. The raw IP address and the raw user agent are never stored, and the salt is replaced every day and the old one destroyed — which makes visits from different days impossible to link back together. Since the editor has no account system, nothing about a visit is ever linked to a name or an email.`,
      `Correspondence. If you write to us, we hold your message and your email address for as long as it takes to answer you and to keep a record of the exchange.`,
      `That is the complete list. We do not ask for your name, your email address or any other identifier in order to use the editor.`,
    ],
  },
  {
    heading: "3. What we do not collect",
    paragraphs: [
      `Your diagrams. Everything you draw or type in the editor is rendered by JavaScript running in your own browser. It is never uploaded, never transmitted to us and never stored on our servers. We could not produce a copy of your diagram if we were asked to.`,
      `We do not use Google Analytics, PostHog, Facebook Pixel, Hotjar, session recording, retargeting pixels, or any other third-party analytics or advertising tracker. No advertising network is told anything about you.`,
      `There is no account system, so we hold no user profiles, no passwords and no payment data of any kind.`,
    ],
  },
  {
    heading: "4. Local storage on your device",
    paragraphs: [
      `The editor saves your current diagram in your browser's local storage so that it is still there when you come back. This is technical storage strictly necessary to provide the feature you asked for, it stays on your device, and it is never sent to us — which is why no cookie banner is shown.`,
      `You can erase it at any time by clearing your browser's site data for ${OPERATOR.domain}, or by using the editor's own "Clear everything" button. Doing so deletes the diagram permanently; we hold no backup.`,
      `We set no advertising cookies and no analytics cookies. The usage measurement described in section 2 deliberately sets none either: it stores nothing on your device at all, not a cookie, not a local-storage entry, not a device identifier — a visit is recognised entirely from the request itself, on our server.`,
    ],
  },
  {
    heading: "5. Legal bases",
    paragraphs: [
      `Server logs are processed on the basis of our legitimate interest (Article 6(1)(f) GDPR) in keeping the service available and secure. The interest is narrow, the data is kept briefly, and it is not used to build a profile of anyone.`,
      `Usage measurement is processed on the same legitimate-interest basis: it tells us which parts of the editor people actually use, without building a cross-visit or cross-site profile of anyone. You can object at any time by emailing ${OPERATOR.contactEmail}, and we will delete the visits concerned.`,
      `Correspondence is processed on the basis of our legitimate interest in answering the messages sent to us.`,
      `Local storage on your device is strictly necessary for the functioning of a service you have explicitly requested, and therefore does not require consent under the ePrivacy Directive.`,
    ],
  },
  {
    heading: "6. Who processes data on our behalf",
    paragraphs: [
      `${OPERATOR.hostingProvider} — hosting for the server that serves this website, and for the separate analytics service described in section 2, both inside the European Union.`,
      `Cloudflare — DNS for the domain.`,
      `We do not sell, rent or trade personal data, and we share none of it for advertising purposes.`,
    ],
  },
  {
    heading: "7. How long we keep it",
    paragraphs: [
      `Server logs are rotated and deleted within 30 days, except for individual entries retained longer where they document an ongoing security incident.`,
      `Usage measurement (visits and events) is kept for 12 months, then deleted. The daily salt that produced a visit's hash is destroyed after a day, so older visits cannot be traced back to a device even by us.`,
      `Correspondence is kept for as long as needed to handle your request and, where relevant, to comply with a legal obligation.`,
      `Diagrams have no retention period because we never receive them.`,
    ],
  },
  {
    heading: "8. International transfers",
    paragraphs: [
      `Our server is located in the European Union and the data described above is processed there. We do not transfer personal data outside the European Economic Area.`,
    ],
  },
  {
    heading: "9. Your rights",
    paragraphs: [
      `Under the GDPR you have the right to access your personal data, to have it corrected or erased, to restrict or object to its processing, and to receive it in a portable form. To exercise any of these rights, write to ${OPERATOR.contactEmail}.`,
      `In practice, an access request here can only concern server logs, usage measurement or correspondence, since nothing else about you exists on our side. Because logs and usage measurement are keyed by IP address and a rotating hash, not by identity, we may need additional information from you to locate the entries that relate to you — and we will not collect extra data purely in order to identify you.`,
      `You also have the right to lodge a complaint with the Spanish Data Protection Agency (Agencia Española de Protección de Datos, www.aepd.es) or with the supervisory authority of your country of residence.`,
    ],
  },
  {
    heading: "10. Children",
    paragraphs: [
      `The service is not directed at children under 14 and we do not knowingly collect personal data from them. Since no account is created and no personal data is requested to use the editor, the point is largely theoretical — but if you believe a child's data has reached us, write to ${OPERATOR.contactEmail} and we will delete it.`,
    ],
  },
  {
    heading: "11. Security",
    paragraphs: [
      `The site is served exclusively over HTTPS. Access to the server is restricted to the operator through key-based authentication.`,
      `The strongest protection here is structural rather than technical: your diagrams are not on our server, so no breach of it can expose them.`,
    ],
  },
  {
    heading: "12. Changes to this policy",
    paragraphs: [
      `We may update this policy to reflect changes to the service or to the law. The revision date at the top of this page always shows when it last changed. Continued use after an update constitutes acceptance of the revised policy.`,
    ],
  },
  {
    heading: "13. Contact",
    paragraphs: [
      `For any question about this policy or about your personal data: ${OPERATOR.contactEmail}.`,
      `${OPERATOR.legalName}, ${OPERATOR.fiscalAddress}.`,
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    paragraphs: [
      `Last updated: ${LEGAL_LAST_UPDATED}`,
      `These Terms of Service govern your use of ${OPERATOR.brand}, the diagram editor available at ${OPERATOR.domain} (the "Service"), operated by ${OPERATOR.legalName}, ${OPERATOR.status}, with fiscal address at ${OPERATOR.fiscalAddress} (Tax ID: ${OPERATOR.taxId}).`,
      `By using the Service you agree to these Terms. If you do not agree with them, please do not use the Service.`,
    ],
  },
  {
    heading: "1. The Service",
    paragraphs: [
      `${OPERATOR.brand} is a web-based editor for diagrams written in the mermaid syntax. It runs in your browser: diagrams are composed, rendered and exported locally on your device.`,
      `No account is required and none can be created. Nothing you draw is transmitted to or stored by us.`,
    ],
  },
  {
    heading: "2. Free of charge",
    paragraphs: [
      `The Service is provided free of charge, in full, with no paid tier, no trial period and no feature held back behind a payment. There is no subscription to cancel and no billing relationship between us.`,
      `Because the Service is free, no consumer right of withdrawal arises and no refund can be owed.`,
    ],
  },
  {
    heading: "3. Your content",
    paragraphs: [
      `The diagrams you create are yours. We claim no ownership of them, no licence over them, and we could not use them in any way even if we wanted to — they never reach us.`,
      `You are responsible for keeping your own copies. Diagrams live in your browser's local storage, which is erased when you clear your browser data, use a different device or browser, or browse in a private window. Export the source if the diagram matters to you.`,
      `We provide no backup, no recovery and no version history.`,
    ],
  },
  {
    heading: "4. Acceptable use",
    paragraphs: [
      `You agree not to use the Service to break the law, to infringe anyone's rights, or to attempt to disrupt, overload or gain unauthorised access to our infrastructure.`,
      `Automated bulk requests, scraping and load testing against our server are not permitted. Note that the editor itself runs locally, so there is no legitimate reason to send it heavy automated traffic.`,
    ],
  },
  {
    heading: "5. Availability",
    paragraphs: [
      `The Service is provided "as is" and "as available". We make no commitment to any level of uptime, and we may change, suspend or discontinue it — in whole or in part — at any time and without notice.`,
      `If the Service disappears tomorrow, the diagrams stored in your browser remain in your browser, and their mermaid source can be opened in any other mermaid renderer.`,
    ],
  },
  {
    heading: "6. No warranty",
    paragraphs: [
      `To the fullest extent permitted by law, the Service is provided without warranty of any kind, express or implied, including any implied warranty of merchantability, fitness for a particular purpose or non-infringement.`,
      `We do not warrant that rendering is free of defects, that every mermaid construct is supported, or that an exported file will be accepted by any particular third-party tool.`,
    ],
  },
  {
    heading: "7. Limitation of liability",
    paragraphs: [
      `To the fullest extent permitted by law, we are not liable for any indirect, incidental, special or consequential damages, nor for loss of data, loss of profits or business interruption arising out of or in connection with your use of the Service.`,
      `Since the Service is provided free of charge, our aggregate liability for any claim relating to it is limited to the amount you have paid for it, which is zero.`,
      `Nothing in these Terms excludes liability that cannot be excluded under applicable law, including liability for death or personal injury caused by negligence, or for fraud.`,
    ],
  },
  {
    heading: "8. Third-party components",
    paragraphs: [
      `Diagram rendering is performed by mermaid, an open-source library distributed under the MIT licence. Its behaviour, its supported syntax and its own terms are those of that project.`,
      `Any third-party service you paste an exported diagram into is governed by that service's own terms, not by these.`,
    ],
  },
  {
    heading: "9. Privacy",
    paragraphs: [
      `Our handling of personal data is described in the Privacy Policy, which forms part of these Terms.`,
    ],
  },
  {
    heading: "10. Governing law and jurisdiction",
    paragraphs: [
      `These Terms are governed by Spanish law.`,
      `Any dispute shall be submitted to the courts of Oviedo, Spain, except where mandatory consumer-protection rules give you the right to bring proceedings before the courts of your own place of residence.`,
    ],
  },
  {
    heading: "11. Changes to these Terms",
    paragraphs: [
      `We may update these Terms to reflect changes to the Service or to the law. The revision date at the top of this page always shows when they last changed. Continued use after an update constitutes acceptance of the revised Terms.`,
    ],
  },
  {
    heading: "12. Contact",
    paragraphs: [
      `For any question about these Terms: ${OPERATOR.contactEmail}.`,
      `${OPERATOR.legalName}, ${OPERATOR.fiscalAddress}.`,
    ],
  },
];
