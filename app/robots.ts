import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// AI crawlers are listed explicitly rather than left to the wildcard. The
// wildcard already allows them, but an explicit group is what the operators
// document, and it makes the decision visible instead of accidental:
// training crawlers (GPTBot, ClaudeBot, Google-Extended, meta-external) are
// allowed alongside the answer-time ones (OAI-SearchBot, Claude-SearchBot,
// PerplexityBot) — being cited is worth more here than withholding copy that
// is public marketing text anyway.
const AI_AGENTS = [
  // Training / dataset crawlers.
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
  "CCBot",
  // Answer-time retrieval — these are the ones that produce citations.
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Query patterns are campaign noise: no page varies on them, and the
        // canonical tag already points at the clean URL, but crawling them
        // wastes budget on a small site with no authority to spare. Note this
        // is best-effort: Google's robots parser matches paths only (queries
        // are stripped), so these two patterns are inert for Googlebot and
        // only honoured by engines that apply them (Bing, Yandex, …).
        disallow: ["/*?*utm_", "/*?*from="],
      },
      { userAgent: AI_AGENTS, allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
