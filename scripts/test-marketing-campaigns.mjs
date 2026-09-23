import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/features/admin/marketing-campaigns.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildCampaignDashboard, fetchMarketingPages } = await import(
  "data:text/javascript;base64," + Buffer.from(javascript).toString("base64")
);

const metric = (campaign_id, patch = {}) => ({
  campaign_id,
  spend: 0,
  conversations: 0,
  impressions: 0,
  clicks: 0,
  leads: 0,
  ...patch,
});
const lead = (campaign_id, patch = {}) => ({
  campaign_id,
  stage: "lead",
  converted_revenue: 0,
  city: "Ottawa",
  province: "Ontario",
  ...patch,
});
const breakdown = (campaign_id, breakdown_type, breakdown_value, patch = {}) => ({
  campaign_id,
  breakdown_type,
  breakdown_value,
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  conversations: 0,
  leads: 0,
  ...patch,
});
const metrics = [
  metric("residential", { spend: 100, conversations: 3, impressions: 1000, clicks: 20, leads: 2 }),
  metric("moving", { spend: 900, conversations: 90, impressions: 9000, clicks: 900, leads: 90 }),
  metric("residential", { spend: 20, conversations: 2, impressions: 500, clicks: 10, leads: 1 }),
];
const leads = [
  lead("residential", { stage: "quoted", converted_revenue: 40, city: " Ottawa " }),
  lead("residential", { stage: "converted", converted_revenue: 200 }),
  lead("moving", { stage: "converted", converted_revenue: 900 }),
  lead(null, { stage: "converted", converted_revenue: 800 }),
  lead("residential", {
    stage: "converted",
    converted_revenue: 100,
    city: "Gatineau",
    province: "Quebec",
  }),
  lead("residential", { city: null, province: " " }),
];
const breakdowns = [
  breakdown("residential", "age", "35-44", {
    spend: 80,
    impressions: 800,
    reach: 500,
    clicks: 15,
    conversations: 2,
    leads: 2,
  }),
  breakdown("moving", "age", "35-44", {
    spend: 900,
    impressions: 9000,
    reach: 8000,
    clicks: 900,
    conversations: 90,
    leads: 90,
  }),
  breakdown("residential", "age", "35-44", {
    spend: 40,
    impressions: 700,
    reach: 400,
    clicks: 15,
    conversations: 3,
    leads: 1,
  }),
  breakdown("residential", "region", "Ontario", {
    spend: 120,
    impressions: 1500,
    reach: 900,
    clicks: 30,
    conversations: 5,
    leads: 3,
  }),
  breakdown("moving", "region", "Ontario", {
    spend: 900,
    impressions: 9000,
    reach: 8000,
    clicks: 900,
    conversations: 90,
    leads: 90,
  }),
];

let passed = 0;
async function test(name, callback) {
  await callback();
  passed++;
  console.log("PASS " + name);
}

await test("Campaign scope excludes other campaigns and unassigned CRM leads from every section", () => {
  const data = buildCampaignDashboard("residential", metrics, leads, breakdowns);
  assert.deepEqual(data.summary, {
    spend: 120,
    messages: 5,
    impressions: 1500,
    clicks: 30,
    metaLeads: 3,
    leads: 4,
    quotes: 3,
    clients: 2,
    revenue: 340,
    cac: 60,
    roas: 340 / 120,
  });
  assert.deepEqual(data.cityRows, [
    { city: "Ottawa", province: "Ontario", leads: 2, quotes: 2, customers: 1, revenue: 240 },
    { city: "Gatineau", province: "Quebec", leads: 1, quotes: 1, customers: 1, revenue: 100 },
    { city: "Unknown", province: "Unknown", leads: 1, quotes: 0, customers: 0, revenue: 0 },
  ]);
  assert.deepEqual(data.ageRows, [
    {
      value: "35-44",
      spend: 120,
      impressions: 1500,
      reach: 900,
      clicks: 30,
      conversations: 5,
      leads: 3,
      costPerLead: 40,
    },
  ]);
  assert.deepEqual(data.regionRows, [{ ...data.ageRows[0], value: "Ontario" }]);
  const moving = buildCampaignDashboard("moving", metrics, leads, breakdowns);
  assert.equal(moving.summary.spend, 900);
  assert.equal(moving.summary.leads, 1);
  assert.equal(moving.summary.revenue, 900);
  assert.equal(moving.cityRows[0].leads, 1);
  assert.equal(moving.ageRows[0].leads, 90);
});

await test("City grouping keeps provinces distinct and never mutates the input data", () => {
  const input = [
    lead("a", { city: " Ottawa ", province: " Ontario " }),
    lead("a", { city: "Ottawa", province: "Quebec" }),
    lead("a", { city: "A|B", province: "C" }),
    lead("a", { city: "A", province: "B|C" }),
  ];
  const before = JSON.stringify({ metrics, leads: input, breakdowns });
  const result = buildCampaignDashboard("a", metrics, input, breakdowns);
  assert.equal(result.cityRows.length, 4);
  assert.equal(
    result.cityRows.find((row) => row.city === "Ottawa" && row.province === "Ontario").leads,
    1,
  );
  assert.equal(
    result.cityRows.find((row) => row.city === "Ottawa" && row.province === "Quebec").leads,
    1,
  );
  assert.equal(JSON.stringify({ metrics, leads: input, breakdowns }), before);
});

await test("No selection and a new campaign show empty data instead of another campaign's results", () => {
  for (const campaign of ["", "new-campaign"]) {
    const data = buildCampaignDashboard(campaign, metrics, leads, breakdowns);
    assert.deepEqual(data.summary, {
      spend: 0,
      messages: 0,
      impressions: 0,
      clicks: 0,
      metaLeads: 0,
      leads: 0,
      quotes: 0,
      clients: 0,
      revenue: 0,
      cac: null,
      roas: null,
    });
    assert.deepEqual([data.cityRows, data.ageRows, data.regionRows], [[], [], []]);
  }
  const emptyId = buildCampaignDashboard(
    "",
    [metric("", { spend: 100 })],
    [lead("")],
    [breakdown("", "age", "18-24")],
  );
  assert.equal(emptyId.summary.spend, 0);
  assert.equal(emptyId.summary.leads, 0);
  assert.deepEqual(emptyId.ageRows, []);
});

await test("Meta totals come from daily metrics without double-counting age and region breakdowns", () => {
  const result = buildCampaignDashboard("residential", [], leads, breakdowns);
  assert.equal(result.summary.spend, 0);
  assert.equal(result.summary.impressions, 0);
  assert.equal(result.summary.metaLeads, 0);
  assert.equal(result.summary.leads, 4);
  assert.equal(result.ageRows[0].impressions, 1500);
  assert.equal(result.regionRows[0].impressions, 1500);
});

await test("Missing conversion denominators yield unavailable ratios rather than fake zero costs", () => {
  const withoutClients = buildCampaignDashboard("a", [metric("a", { spend: 50 })], [lead("a")], []);
  assert.equal(withoutClients.summary.cac, null);
  assert.equal(withoutClients.summary.roas, 0);
  const withoutSpend = buildCampaignDashboard(
    "a",
    [],
    [lead("a", { stage: "converted", converted_revenue: 100 })],
    [],
  );
  assert.equal(withoutSpend.summary.cac, 0);
  assert.equal(withoutSpend.summary.roas, null);
});

await test("Numeric strings and absent or invalid numbers do not concatenate or poison totals", () => {
  const result = buildCampaignDashboard(
    "a",
    [
      metric("a", {
        spend: "10.10",
        impressions: "12",
        conversations: null,
        clicks: undefined,
        leads: "2",
      }),
      metric("a", {
        spend: "0.20",
        impressions: NaN,
        conversations: Infinity,
        clicks: "invalid",
        leads: null,
      }),
    ],
    [lead("a", { converted_revenue: "20.10" }), lead("a", { converted_revenue: "0.20" })],
    [
      breakdown("a", "age", "18-24", { spend: "3.30", impressions: "7", reach: null, leads: "2" }),
      breakdown("a", "age", "18-24", {
        spend: "0.10",
        impressions: undefined,
        reach: Infinity,
        leads: null,
      }),
    ],
  );
  assert.equal(result.summary.spend, 10.3);
  assert.equal(result.summary.impressions, 12);
  assert.equal(result.summary.clicks, 0);
  assert.equal(result.summary.messages, 0);
  assert.equal(result.summary.revenue, 20.3);
  assert.equal(result.cityRows[0].revenue, 20.3);
  assert.equal(result.ageRows[0].spend, 3.4);
  assert.equal(result.ageRows[0].impressions, 7);
  assert.equal(result.ageRows[0].costPerLead, 1.7);
});

await test("Audience sorting prioritizes leads, conversations, clicks, then impressions", () => {
  const rows = [
    breakdown("a", "age", "18-24", { impressions: 10 }),
    breakdown("a", "age", "25-34", { impressions: 20 }),
    breakdown("a", "age", "35-44", { clicks: 1 }),
    breakdown("a", "age", "45-54", { conversations: 1 }),
    breakdown("a", "age", "55-64", { leads: 1 }),
    breakdown("a", "country", "Canada", { leads: 100 }),
  ];
  const result = buildCampaignDashboard("a", [], [], rows);
  assert.deepEqual(
    result.ageRows.map((row) => row.value),
    ["55-64", "45-54", "35-44", "25-34", "18-24"],
  );
  assert.equal(result.ageRows.find((row) => row.value === "45-54").costPerLead, null);
  assert.deepEqual(result.regionRows, []);
});

await test("Pagination reads all 2,305 records in stable, non-overlapping inclusive ranges", async () => {
  const records = Array.from({ length: 2305 }, (_, id) => ({ id }));
  const ranges = [];
  const result = await fetchMarketingPages(async (from, to) => {
    ranges.push([from, to]);
    return { data: records.slice(from, to + 1), error: null };
  });
  assert.deepEqual(ranges, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
  assert.deepEqual(result, records);
});

await test("Exact-page and empty responses terminate without losing the final record", async () => {
  const records = Array.from({ length: 1000 }, (_, id) => id);
  let calls = 0;
  const result = await fetchMarketingPages(async (from, to) => {
    calls++;
    return { data: records.slice(from, to + 1), error: null };
  });
  assert.equal(calls, 2);
  assert.deepEqual(result, records);
  assert.deepEqual(await fetchMarketingPages(async () => ({ data: null, error: null })), []);
});

await test("A later-page backend or network error rejects the complete load instead of returning partial totals", async () => {
  for (const networkFailure of [false, true]) {
    let calls = 0;
    await assert.rejects(
      fetchMarketingPages(async (from) => {
        calls++;
        if (from === 0)
          return { data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null };
        if (networkFailure) throw new Error("Network unavailable");
        return { data: [{ id: 1000 }], error: { message: "Access denied" } };
      }),
      networkFailure ? /Network unavailable/ : /Access denied/,
    );
    assert.equal(calls, 2);
  }
});

console.log(`${passed} marketing campaign checks passed; all data and page requests were mocked.`);
