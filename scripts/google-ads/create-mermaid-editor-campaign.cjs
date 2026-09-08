// Creates a Google Ads Search campaign for IQ Mermaid (iq-mermaid.com).
//
// Fresh, self-contained campaign for ONE broad keyword — "mermaid editor".
// Deliberately carries NOTHING over from other products (iq-rest / QR Menu):
//   - no image assets, no logo/brand assets, no sitelinks/callouts/snippets
//   - no foreign negatives, no foreign copy ("IQ Rest", "QR Menu", restaurant terms)
//   - no conversion actions (GOOGLE_ADS_CONVERSION_ACTION_ID* is never used)
//   - final URL host is iq-mermaid.com only
//
// Campaign shape:
//   - Search campaign, MANUAL CPC (enhanced CPC off)
//   - daily budget €0.50
//   - 1 ad group, ad-group default max CPC €0.01 (10 000 micros = 1 EUR billable unit)
//   - 1 keyword: "mermaid editor" (BROAD)
//   - language: English (no geo restriction = all countries)
//   - 1 responsive search ad (text only, no assets)
//
// Usage (run from repo root, .env must hold the GOOGLE_ADS_* keys):
//   node --env-file=.env scripts/google-ads/create-mermaid-editor-campaign.cjs             — LIVE (ENABLED)
//   node --env-file=.env scripts/google-ads/create-mermaid-editor-campaign.cjs --dry-run   — log only

const { GoogleAdsApi, enums } = require("google-ads-api");

const DRY = process.argv.includes("--dry-run");

// ── Config ────────────────────────────────────────────────────────────────
const CAMPAIGN_NAME = "Mermaid — Search — mermaid editor (broad, manual €0.01)";
const DAILY_BUDGET_EUR = 0.5; // €0.50/day — Google minimum-ish; spend stays ~zero at €0.01 CPC
const MAX_CPC_EUR = 0.01; // user requirement: manual max CPC €0.01 = 10 000 micros
const ENGLISH_LANG = "languageConstants/1000";
const LANDING_URL = "https://iq-mermaid.com"; // EN home (English default route)
const PATH1 = "mermaid";
const PATH2 = "editor";

// Single broad keyword — that is the whole ad group.
const KEYWORDS = [{ text: "mermaid editor", match: "BROAD" }];

// Mermaid-only negatives (PHRASE). Guard against broad-match junk; trimmable.
// Nothing here belongs to another product.
const NEGATIVES = [
  "download", "apk", "mod", "crack", "serial", "keygen", "hack",
  "vscode", "vs code", "plugin", "extension", "python", "npm",
  "games", "movie", "film", "wedding", "sirena",
];

// Responsive search ad — text only. Copy mirrors real strings from the site
// (content/chrome/en.json): free, visual canvas + code, export SVG/PNG, email-only sign-in.
const HEADLINES = [
  "Free Mermaid Live Editor",
  "Mermaid Editor Online",
  "Visual Canvas + Mermaid Code",
  "Draw Diagrams in the Browser",
  "Free Forever, No Paywall",
  "Sign In With Just an Email",
  "8 Diagram Types Supported",
  "Export to SVG and PNG",
  "Renders as You Type",
  "Code and Canvas in Sync",
  "Mermaid Flowcharts & More",
  "No Credit Card Required",
];

const DESCRIPTIONS = [
  "A mermaid editor that keeps a visual canvas and the code in sync. Free, no paywall.",
  "Draw by clicking and dragging, or write mermaid by hand. Export SVG, PNG, .mmd or Markdown.",
  "The real mermaid engine redraws moments after your last keystroke. Sign in with just an email.",
  "Free online mermaid editor. Click to add a block, drag an arrow — the code writes itself.",
];

// ── Helpers ───────────────────────────────────────────────────────────────
function log(s) {
  console.log(s);
}
function dryRun(label, payload) {
  if (DRY) log(`[DRY] ${label}: ${JSON.stringify(payload).slice(0, 300)}...`);
}
function micros(eur) {
  return Math.round(eur * 1_000_000 / 10_000) * 10_000; // multiple of the €0.01 billable unit
}

const requiredEnv = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
];
for (const k of requiredEnv) {
  if (!process.env[k]) {
    console.error(`MISSING env var ${k} — add it to .env (copy from iq-rest/.env).`);
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

  log(`\n${DRY ? "DRY-RUN — no mutations" : "LIVE — will create campaign"}`);
  log(`Customer: ${process.env.GOOGLE_ADS_CUSTOMER_ID}`);
  log(`Campaign: "${CAMPAIGN_NAME}"`);

  // ── Pre-flight: duplicate campaign name? ──────────────────────────────
  log("\nPre-flight: checking for an existing campaign with the same name...");
  const existing = await customer.query(
    `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.name = '${CAMPAIGN_NAME.replace(/'/g, "\\'")}'`,
  );
  if (existing.length > 0) {
    log(`ABORT — campaign "${CAMPAIGN_NAME}" already exists (id=${existing[0].campaign.id}).`);
    log("Delete it in the Google Ads UI or change CAMPAIGN_NAME before re-running.");
    process.exit(1);
  }
  log("  OK — name is free.");

  // ── 1. Budget ─────────────────────────────────────────────────────────
  log(`\n[1] Campaign budget €${DAILY_BUDGET_EUR}/day...`);
  let budgetResource;
  if (DRY) {
    budgetResource = "customers/X/campaignBudgets/dry";
    dryRun("budget", { name: `${CAMPAIGN_NAME} — Budget`, amount_micros: micros(DAILY_BUDGET_EUR) });
  } else {
    const r = await customer.campaignBudgets.create([
      {
        name: `${CAMPAIGN_NAME} — Budget`,
        amount_micros: micros(DAILY_BUDGET_EUR),
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        explicitly_shared: false,
      },
    ]);
    budgetResource = r.results[0].resource_name;
    log(`  Budget created: ${budgetResource}`);
  }

  // ── 2. Campaign ───────────────────────────────────────────────────────
  log(`\n[2] Campaign "${CAMPAIGN_NAME}" — SEARCH, Manual CPC (no Enhanced), ENABLED...`);
  let campaignResource;
  if (DRY) {
    campaignResource = "customers/X/campaigns/dry";
  } else {
    const r = await customer.campaigns.create([
      {
        name: CAMPAIGN_NAME,
        status: enums.CampaignStatus.ENABLED,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        manual_cpc: { enhanced_cpc_enabled: false },
        campaign_budget: budgetResource,
        network_settings: {
          target_google_search: true,
          target_search_network: false,
          target_content_network: false,
          target_partner_search_network: false,
        },
        contains_eu_political_advertising:
          enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
      },
    ]);
    campaignResource = r.results[0].resource_name;
    log(`  Campaign created: ${campaignResource}`);
  }

  // ── 3. Campaign criteria — language EN + negatives (no geo = worldwide) ──
  log(`\n[3] Campaign criteria — language English, ${NEGATIVES.length} mermaid-only negatives (no geo)...`);
  const criteriaOps = [{ campaign: campaignResource, language: { language_constant: ENGLISH_LANG } }];
  for (const neg of NEGATIVES) {
    criteriaOps.push({
      campaign: campaignResource,
      negative: true,
      keyword: { text: neg, match_type: enums.KeywordMatchType.PHRASE },
    });
  }
  if (DRY) {
    dryRun("campaign criteria", { count: criteriaOps.length });
  } else {
    await customer.campaignCriteria.create(criteriaOps);
    log(`  ${criteriaOps.length} criteria added`);
  }

  // ── 4. Ad group (default max CPC €0.01) + single broad keyword ────────
  log(`\n[4] Ad group "AG — mermaid editor (broad)" — default max CPC €${MAX_CPC_EUR}...`);
  let adGroupResource;
  if (DRY) {
    adGroupResource = "customers/X/adGroups/dry";
  } else {
    const r = await customer.adGroups.create([
      {
        campaign: campaignResource,
        name: "AG — mermaid editor (broad)",
        status: enums.AdGroupStatus.ENABLED,
        type: enums.AdGroupType.SEARCH_STANDARD,
        cpc_bid_micros: micros(MAX_CPC_EUR),
      },
    ]);
    adGroupResource = r.results[0].resource_name;
    log(`  Ad group created: ${adGroupResource}`);
  }

  log(`  Adding ${KEYWORDS.length} keyword(s)...`);
  const kwOps = KEYWORDS.map((kw) => ({
    ad_group: adGroupResource,
    status: enums.AdGroupCriterionStatus.ENABLED,
    keyword: { text: kw.text, match_type: enums.KeywordMatchType.BROAD },
  }));
  if (DRY) {
    dryRun("keywords", kwOps);
  } else {
    await customer.adGroupCriteria.create(kwOps);
    log(`    ${kwOps.length} keywords added`);
  }

  // ── 5. One responsive search ad — text only, NO assets attached ───────
  log(`\n[5] 1 responsive search ad (text only, no image/sitelink/callout assets)...`);
  const adOps = [
    {
      ad_group: adGroupResource,
      status: enums.AdGroupAdStatus.ENABLED,
      ad: {
        final_urls: [LANDING_URL],
        responsive_search_ad: {
          headlines: HEADLINES.slice(0, 15).map((h) => ({ text: h.slice(0, 30) })),
          descriptions: DESCRIPTIONS.slice(0, 4).map((d) => ({ text: d.slice(0, 90) })),
          path1: PATH1.slice(0, 15),
          path2: PATH2.slice(0, 15),
        },
      },
    },
  ];
  if (DRY) {
    dryRun("RSA", { headlines: HEADLINES.slice(0, 15).length, descriptions: DESCRIPTIONS.length, finalUrl: LANDING_URL });
  } else {
    await customer.adGroupAds.create(adOps);
    log(`    RSA added`);
  }

  log(`\n✓ Done. Campaign "${CAMPAIGN_NAME}" is ${DRY ? "(dry-run only)" : "LIVE"} — no assets, 1 broad keyword, manual CPC €${MAX_CPC_EUR}.`);
  log(`  Manage: https://ads.google.com/aw/campaigns?ocid=${process.env.GOOGLE_ADS_CUSTOMER_ID}`);
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  if (e?.errors) console.error("Errors:", JSON.stringify(e.errors, null, 2));
  process.exit(1);
});
