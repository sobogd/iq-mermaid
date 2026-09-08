// Keyword-landscape check for "mermaid editor" (English, US geo — representative).
// Read-only KeywordPlanIdeaService call: shows avg monthly searches, competition and
// the low/high TOP-OF-PAGE bid range in EUR (account currency) for the seed + expansions.
// Use this to sanity-check whether a €0.01 max CPC can realistically serve.
//
// Usage: node --env-file=.env scripts/google-ads/keyword-research-mermaid-editor.cjs

const { GoogleAdsApi } = require("google-ads-api");

const SEEDS = ["mermaid editor"];
const GEO = "geoTargetConstants/2840"; // United States — largest EN market; currency = account EUR
const LANG = "languageConstants/1000"; // English

const requiredEnv = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
];
for (const k of requiredEnv) {
  if (!process.env[k]) {
    console.error(`MISSING env var ${k}`);
    process.exit(1);
  }
}

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });

  console.log(`\nRequesting keyword ideas — seeds ${JSON.stringify(SEEDS)}, EN language, US geo (EUR account currency)...\n`);
  const ideas = await customer.keywordPlanIdeas.generateKeywordIdeas({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    geo_target_constants: [GEO],
    language: LANG,
    keyword_plan_network: "GOOGLE_SEARCH",
    keyword_seed: { keywords: SEEDS },
    include_adult_keywords: false,
    page_size: 60,
  });

  const rows = ideas.map((idea) => {
    const m = idea.keyword_idea_metrics || {};
    const low = Number(m.low_top_of_page_bid_micros) || 0;
    const high = Number(m.high_top_of_page_bid_micros) || 0;
    return {
      keyword: idea.text || "",
      searches: Number(m.avg_monthly_searches) || 0,
      competition: m.competition || "UNSPECIFIED",
      compIdx: m.competition_index != null ? Number(m.competition_index) : null,
      lowEur: low / 1_000_000,
      highEur: high / 1_000_000,
    };
  });
  rows.sort((a, b) => b.searches - a.searches);

  console.log(`${rows.length} keyword ideas\n`);
  console.log(
    "keyword".padEnd(45) + "searches".padStart(10) + "  comp".padEnd(7) + "idx".padStart(5) + "  lowTop€".padStart(9) + "  highTop€".padStart(10),
  );
  console.log("-".repeat(90));
  for (const r of rows) {
    console.log(
      r.keyword.slice(0, 44).padEnd(45) +
        String(r.searches).padStart(10) +
        ("  " + r.competition.slice(0, 4)).padEnd(7) +
        (r.compIdx != null ? String(r.compIdx).padStart(5) : "   -") +
        r.lowEur.toFixed(2).padStart(9) +
        r.highEur.toFixed(2).padStart(10),
    );
  }
  console.log("\nNote: top-of-page bids are EUR. Serving at all (even bottom of page 1) usually needs ~the low end; €0.01 is far below unless a query has literally no other bidders and a sub-cent reserve.");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e, e?.errors ? JSON.stringify(e.errors, null, 2) : "");
  process.exit(1);
});
