import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual Edge Function with isolated fake Meta/Supabase services.
const source = readFileSync(
  new URL("../supabase/functions/sync-meta-ads/index.ts", import.meta.url),
  "utf8",
).replace(/^import .*createClient.*;$/m, "const createClient = mockCreateClient;");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

async function run({ failGenderPage = false, repeatCursor = false, authorized = true } = {}) {
  let handler;
  const writes = [];
  const requests = [];
  const db = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        update() {
          return query;
        },
        async maybeSingle() {
          return { data: { id: "crm-campaign-a" }, error: null };
        },
        async upsert(row, options) {
          writes.push({ table, row, options });
          return { error: null };
        },
      };
      return query;
    },
  };
  vm.runInNewContext(code, {
    mockCreateClient: () => db,
    Deno: {
      env: {
        get: (key) =>
          ({
            SUPABASE_URL: "https://example.invalid",
            SUPABASE_ANON_KEY: "fake-anon",
            SUPABASE_SERVICE_ROLE_KEY: "fake-service",
            META_SYNC_CRON_SECRET: "fixture",
            META_ACCESS_TOKEN: "fake-meta",
            META_AD_ACCOUNT_ID: "123",
          })[key],
      },
      serve: (callback) => {
        handler = callback;
      },
    },
    URLSearchParams,
    Response,
    Date,
    fetch: async (url) => {
      const params = new URL(url).searchParams;
      const type = params.get("breakdowns") || "campaign";
      const after = params.get("after");
      requests.push({ type, after });
      if (type === "gender" && after && failGenderPage) {
        return Response.json({ error: { message: "Simulated Meta failure" } }, { status: 400 });
      }
      const row = {
        campaign_id: "meta-a",
        campaign_name: "A",
        date_start: "2026-09-23",
        impressions: "10",
        spend: "2",
        clicks: "1",
        reach: "8",
        actions: [{ action_type: "lead", value: "1" }],
      };
      if (type !== "gender") return Response.json({ data: [{ ...row, [type]: "35-44" }] });
      if (!after || repeatCursor)
        return Response.json({
          data: [{ ...row, gender: "female" }],
          paging: { next: "https://graph.facebook.com/next", cursors: { after: "page2" } },
        });
      return Response.json({ data: [{ ...row, gender: "male" }, { ...row }] });
    },
  });
  const response = await handler(
    new Request("https://example.invalid/sync", {
      method: "POST",
      headers: authorized ? { "x-cron-secret": "fixture" } : {},
    }),
  );
  return { response, result: await response.json(), writes, requests };
}

const ok = await run();
assert.equal(ok.response.status, 200);
assert.deepEqual(ok.result.warnings, []);
assert.deepEqual(
  ok.requests.filter((x) => x.type === "gender"),
  [
    { type: "gender", after: null },
    { type: "gender", after: "page2" },
  ],
);
const gender = ok.writes.filter((x) => x.row.breakdown_type === "gender");
assert.deepEqual(
  gender.map((x) => x.row.breakdown_value),
  ["female", "male", "unknown"],
);
assert.ok(gender.every((x) => x.row.campaign_id === "crm-campaign-a" && x.row.leads === 1));
assert.ok(
  gender.every(
    (x) => x.options.onConflict === "campaign_id,metric_date,breakdown_type,breakdown_value",
  ),
);
assert.equal(ok.writes.filter((x) => x.table === "marketing_campaign_daily_metrics").length, 1);
console.log(
  "PASS gender import, unknown normalization, campaign association, pagination and separate totals",
);

for (const options of [{ failGenderPage: true }, { repeatCursor: true }]) {
  const failed = await run(options);
  assert.equal(failed.response.status, 200);
  assert.equal(failed.result.warnings.length, 1);
  assert.match(failed.result.warnings[0], /gender/);
  assert.equal(failed.writes.filter((x) => x.row.breakdown_type === "gender").length, 0);
  assert.ok(failed.writes.some((x) => x.row.breakdown_type === "age"));
}
console.log(
  "PASS failed or repeated pages cannot save a truncated gender report; other breakdowns remain available",
);

const denied = await run({ authorized: false });
assert.equal(denied.response.status, 401);
assert.equal(denied.requests.length, 0);
assert.equal(denied.writes.length, 0);
console.log("PASS unauthenticated calls remain blocked");
