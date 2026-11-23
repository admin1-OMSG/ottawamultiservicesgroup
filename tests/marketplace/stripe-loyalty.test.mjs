import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compileFunction } from "node:vm";
import ts from "typescript";

const orderId = "e5b8276f-7d7a-4ab3-af47-78297c4dd7aa";
const order = {
  id: orderId, offer_code: "monthly208", kind: "subscription", name: "OMSG Monthly 208",
  email: "provider@example.test", price_cents: 20800, credits: 240,
  expires_at: "2027-01-15T19:00:00Z", preview_checkout_enabled: false,
};
const environment = {
  SUPABASE_URL: "https://vdeeevxpwjvztsoonuxx.supabase.co", SUPABASE_ANON_KEY: "test-anon",
  SUPABASE_SERVICE_ROLE_KEY: "test-service", MARKET_STRIPE_SECRET_KEY: "sk_test_fixture",
  MARKET_STRIPE_WEBHOOK_SECRET: "whsec_fixture",
};

// Run each deployed entrypoint with its two SDK imports replaced by in-memory services.
function entrypoint(name, stripe, db) {
  const source = readFileSync(new URL(`../../supabase/functions/${name}/index.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } });
  class Stripe {
    static createFetchHttpClient() {}
    static createSubtleCryptoProvider() {}
    constructor() { return stripe; }
  }
  const imports = (specifier) => {
    if (specifier.startsWith("npm:stripe@")) return { default: Stripe };
    if (specifier.startsWith("npm:@supabase/supabase-js@")) return { createClient: () => db };
    throw new Error("Unexpected Edge Function dependency " + specifier);
  };
  let handler;
  const deno = { env: { get: name => environment[name] }, serve: fn => { handler = fn; } };
  compileFunction(outputText, ["require", "exports", "Deno"])(imports, {}, deno);
  return handler;
}

test("208 CAD checkout identifies the same monthly loyalty offer on Stripe's session and subscription", async () => {
  const sessions = [];
  const linked = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "fixture-user" } } }) },
    rpc: async (name, args) => {
      if (name === "market_checkout_begin") {
        assert.equal(args.p_code, "monthly208");
        return { data: order };
      }
      assert.equal(name, "market_checkout_link");
      linked.push(args);
      return {};
    },
  };
  const stripe = { checkout: { sessions: { create: async (params, options) => {
    sessions.push({ params, options });
    return { id: "cs_test_local", url: "https://checkout.stripe.com/test-local" };
  } } } };
  const handler = entrypoint("market-checkout", stripe, db);
  const result = await handler(new Request("https://example.test/", {
    method: "POST", headers: { authorization: "Bearer local-test-session" },
    body: JSON.stringify({ offer_code: "monthly208", attempt_id: "1aea64cd-8186-46a9-ac10-26ef29ae665b" }),
  }));
  assert.equal(result.status, 200);
  assert.equal(sessions.length, 1);
  const [{ params, options }] = sessions;
  assert.equal(params.mode, "subscription");
  assert.deepEqual(params.metadata, { omsg_market: "v1", order_id: orderId, offer_code: "monthly208" });
  assert.deepEqual(params.subscription_data.metadata, params.metadata);
  const price = params.line_items[0].price_data;
  assert.equal(price.currency, "cad");
  assert.equal(price.unit_amount, 20800);
  assert.equal(price.recurring.interval, "month");
  assert.equal(options.idempotencyKey, "omsg-market:" + orderId);
  assert.deepEqual(linked, [{ p_order_id: orderId, p_session: "cs_test_local", p_expired: false }]);
});

const subId = "sub_fixture208";
const period = {
  start: Date.parse("2027-01-31T13:00:00Z") / 1000,
  end: Date.parse("2027-02-28T13:00:00Z") / 1000,
};
function subscriptionLine({ id = subId, proration = false, amount = 20800, dates = period } = {}) {
  return { id: "il_fixture", amount, currency: "cad", period: dates, parent: {
    type: "subscription_item_details", subscription_item_details: {
      subscription: id, subscription_item: "si_fixture", proration,
    },
  } };
}
function invoiceWebhook({ lines, legacyInvoice = false, offerCode = "monthly208", invoiceOverrides = {} }) {
  const writes = [];
  const reads = [];
  const sub = {
    id: subId, metadata: { omsg_market: "v1", order_id: orderId, offer_code: offerCode },
    items: { data: [{ id: "si_fixture", price: { recurring: { interval: "month", interval_count: 1 } } }] },
  };
  const invoice = {
    id: "in_fixture", status: "paid", billing_reason: "subscription_cycle", amount_paid: 20800,
    amount_remaining: 0, customer: "cus_fixture", currency: "cad",
    ...(legacyInvoice ? { subscription: subId } : { parent: { subscription_details: { subscription: subId } } }),
    // The period in the invoice summary describes the preceding usage window.
    period_start: period.start - 7, period_end: period.start,
    lines: { data: [], has_more: true }, ...invoiceOverrides,
  };
  const stripe = {
    webhooks: { constructEventAsync: async raw => JSON.parse(raw) },
    subscriptions: { retrieve: async id => { assert.equal(id, subId); return sub; } },
    invoices: { listLineItems: async function* (id) { reads.push(id); yield* lines; } },
  };
  const db = { rpc: async (name, args) => { writes.push({ name, args }); return {}; } };
  const handler = entrypoint("market-stripe-webhook", stripe, db);
  const submit = () => handler(new Request("https://example.test/", {
    method: "POST", headers: { "stripe-signature": "fixture-signature" },
    body: JSON.stringify({ id: "evt_fixture", livemode: false, type: "invoice.payment_succeeded", data: { object: invoice } }),
  }));
  return { submit, writes, reads };
}
const expectedCredit = {
  p_order_id: orderId, p_object: "in_fixture", p_amount: 20800, p_currency: "cad",
  p_customer: "cus_fixture", p_subscription: subId,
};

test("monthly208 uses the recurring invoice line's actual period across Stripe event versions and redelivery", async () => {
  for (const legacyInvoice of [false, true]) {
    const run = invoiceWebhook({ legacyInvoice, lines: [
      subscriptionLine({ proration: true, dates: { start: period.start + 604800, end: period.end } }),
      subscriptionLine({ id: "sub_other" }), subscriptionLine(),
    ] });
    for (let attempt = 0; attempt < 2; attempt++) assert.equal((await run.submit()).status, 200);
    const write = { name: "market_payment_credit", args: {
      ...expectedCredit, p_period_start: period.start, p_period_end: period.end,
    } };
    assert.deepEqual(run.writes, [write, write]);
    assert.deepEqual(run.reads, ["in_fixture", "in_fixture"]);
  }
});

test("an ineligible or ambiguous invoice period cannot credit monthly208", async () => {
  for (const lines of [[], [subscriptionLine({ proration: true })], [
    subscriptionLine(), subscriptionLine({ dates: { start: period.end, end: period.end + 2678400 } }),
  ]]) {
    const run = invoiceWebhook({ lines });
    assert.equal((await run.submit()).status, 500);
    assert.deepEqual(run.writes, []);
  }
});

test("legacy monthly invoices still use their existing credit path, and unpaid invoices earn nothing", async () => {
  const old = invoiceWebhook({ lines: [], offerCode: "monthly" });
  assert.equal((await old.submit()).status, 200);
  assert.deepEqual(old.writes, [{ name: "market_payment_credit", args: expectedCredit }]);
  assert.deepEqual(old.reads, []);
  const unpaid = invoiceWebhook({ lines: [subscriptionLine()], invoiceOverrides: { status: "open", amount_remaining: 20800 } });
  assert.equal((await unpaid.submit()).status, 200);
  assert.deepEqual(unpaid.writes, []);
  assert.deepEqual(unpaid.reads, []);
});
