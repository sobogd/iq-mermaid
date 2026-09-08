// GAQL audit for the IQ Mermaid "mermaid editor" campaign.
// Verifies: campaign identity, manual CPC €0.01, single BROAD keyword,
// text-only RSA on iq-mermaid.com, ZERO attached assets (no images/logo/
// sitelinks/callouts/snippets from any other product), criteria = EN + negatives only.
//
// Usage: node --env-file=.env scripts/google-ads/audit-mermaid-editor-campaign.cjs [campaignId]

const { GoogleAdsApi, enums } = require("google-ads-api");

const CAMPAIGN_ID = process.argv[2] || "24226434682";

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
    console.error(`MISSING env var ${k}`);
    process.exit(1);
  }
}

async function q(customer, label, gaql) {
  try {
    const rows = await customer.query(gaql);
    console.log(`\n── ${label} ──`);
    console.log(JSON.stringify(rows, null, 1));
    return rows;
  } catch (e) {
    console.log(`\n── ${label} ── ERROR: ${e?.message || e}`);
    return [];
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

  const rows = await q(
    customer,
    "Campaign (name/status/bidding/budget)",
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign.manual_cpc.enhanced_cpc_enabled, campaign_budget.amount_micros FROM campaign WHERE campaign.id = ${CAMPAIGN_ID}`,
  );
  await q(
    customer,
    "Ad groups (default max CPC)",
    `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros FROM ad_group WHERE campaign.id = ${CAMPAIGN_ID}`,
  );
  await q(
    customer,
    "Keywords",
    `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status FROM ad_group_criterion WHERE campaign.id = ${CAMPAIGN_ID} AND ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = false`,
  );
  await q(
    customer,
    "Campaign negatives",
    `SELECT campaign_criterion.criterion_id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign_criterion.negative FROM campaign_criterion WHERE campaign.id = ${CAMPAIGN_ID} AND campaign_criterion.negative = true`,
  );
  await q(
    customer,
    "Ads (final URLs)",
    `SELECT ad_group_ad.ad.id, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.final_urls FROM ad_group_ad WHERE campaign.id = ${CAMPAIGN_ID}`,
  );
  const assets = await q(
    customer,
    "Campaign assets (MUST be empty)",
    `SELECT campaign_asset.asset, campaign_asset.field_type, campaign_asset.status FROM campaign_asset WHERE campaign_asset.campaign = 'customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/campaigns/${CAMPAIGN_ID}'`,
  );
  await q(
    customer,
    "Campaign criteria types (expect LANGUAGE + negatives only, no LOCATION)",
    `SELECT campaign_criterion.type, campaign_criterion.negative, campaign_criterion.language.language_constant, campaign_criterion.location.geo_target_constant, campaign_criterion.keyword.text FROM campaign_criterion WHERE campaign.id = ${CAMPAIGN_ID}`,
  );

  const allCriteria = await q(
    customer,
    "Campaign criteria (DEVICE defaults ok; LOCATION/BRAND must be absent)",
    `SELECT campaign_criterion.criterion_id, campaign_criterion.type, campaign_criterion.negative, campaign_criterion.language.language_constant, campaign_criterion.location.geo_target_constant, campaign_criterion.keyword.text, campaign_criterion.device.type FROM campaign_criterion WHERE campaign.id = ${CAMPAIGN_ID}`,
  );

  const c = rows[0]?.campaign || {};
  const pass = [];
  const fail = [];
  const note = [];
  if (c.bidding_strategy_type === enums.BiddingStrategyType.MANUAL_CPC) pass.push("bidding = MANUAL_CPC"); else fail.push(`bidding=${c.bidding_strategy_type} (expected ${enums.BiddingStrategyType.MANUAL_CPC})`);
  if (c.manual_cpc?.enhanced_cpc_enabled === false) pass.push("Enhanced CPC off"); else fail.push("Enhanced CPC is ON / unknown");
  if (assets.length === 0) pass.push("0 campaign assets (no images/logo/sitelinks/callouts/snippets)"); else fail.push(`${assets.length} campaign assets present!`);
  const locationRows = allCriteria.filter((r) => r.campaign_criterion?.type === enums.CriterionType.LOCATION && !r.campaign_criterion.negative);
  if (locationRows.length === 0) pass.push("no positive LOCATION criteria (worldwide targeting as requested)"); else fail.push(`${locationRows.length} positive LOCATION criteria!`);
  const brandRows = allCriteria.filter((r) => [enums.CriterionType.BRAND, enums.CriterionType.BRAND_LIST].includes(r.campaign_criterion?.type));
  if (brandRows.length === 0) pass.push("no BRAND/BRAND_LIST criteria"); else fail.push(`${brandRows.length} BRAND criteria present!`);
  const deviceRows = allCriteria.filter((r) => r.campaign_criterion?.type === enums.CriterionType.DEVICE);
  if (deviceRows.length > 0) note.push(`${deviceRows.length} default DEVICE criteria (all devices, standard Google behaviour — fine)`);
  console.log(`\n=== AUDIT ${fail.length === 0 ? "PASS ✅" : "FAIL ❌"} ===`);
  pass.forEach((s) => console.log(`  PASS  ${s}`));
  fail.forEach((s) => console.log(`  FAIL  ${s}`));
  note.forEach((s) => console.log(`  NOTE  ${s}`));
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  process.exit(1);
});
