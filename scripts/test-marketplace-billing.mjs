import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const value = async (sql, args = []) => Object.values((await query(sql, args))[0])[0];
const id = randomUUID;
const admin = id(),
  pro = id(),
  account = id(),
  client = id(),
  request = id();
async function role(name, uid, action) {
  await db.exec("set role " + name);
  await query("select set_config('request.jwt.claim.sub',$1,false)", [uid ?? ""]);
  try {
    return await action();
  } finally {
    await db.exec("reset role");
  }
}
const member = (uid, action) => role("authenticated", uid, action);
const operator = (action) => role("service_role", null, action);
const loyaltyPro = id(),
  loyaltyAccount = id();
const loyaltyPurchase = (code) =>
  operator(() => value("select market_checkout_begin($1,$2,$3,null)", [loyaltyPro, code, id()]));
const migrate = async (name) =>
  db.exec(
    await readFile(new URL("../supabase/migrations/" + name + ".sql", import.meta.url), "utf8"),
  );
const balance = () => member(pro, async () => (await value("select market_wallet()")).balance);
const unlock = (cost = 3) => member(pro, () => value("select market_unlock($1,$2)", [request, cost]));
const purchase = (code, attempt = id()) =>
  operator(() => value("select market_checkout_begin($1,$2,$3,null)", [pro, code, attempt]));
const simulate = (order) => operator(() => value("select market_checkout_simulate($1)", [order.id]));
const credit = (order, object, amount, subscription = null) =>
  operator(() =>
    value("select market_payment_credit($1,$2,$3,'cad','cus_test',$4)", [
      order.id,
      object,
      amount,
      subscription,
    ]),
  );

async function test208Loyalty(historicalPaid, historicalOpen) {
  const wallet = () =>
    member(loyaltyPro, async () => (await value("select market_wallet()")).balance);
  async function expectCredit(delta, action) {
    const before = await wallet();
    await action();
    assert.equal(await wallet(), before + delta);
  }
  const invoiceSql = "select public.market_payment_credit($1,$2,$3,'cad','cus_loyalty',$4,$5,$6)";
  const boundary = (month) => Date.UTC(2027, month - 1, 1) / 1000;
  const payMonth = (order, subscription, month) =>
    operator(() =>
      value(invoiceSql, [
        order.id,
        "in_" + subscription + "_" + month,
        order.price_cents,
        subscription,
        boundary(month),
        boundary(month + 1),
      ]),
    );
  const payPack = (order) => credit(order, "cs_" + order.id, order.price_cents);

  // Old checkouts retain their original terms, including on delayed or retried payment.
  await expectCredit(0, () => payPack(historicalPaid));
  await expectCredit(208, () => payPack(historicalOpen));
  await assert.rejects(loyaltyPurchase("monthly208"), /offer_unavailable/);
  await query(
    "update market_billing.offers set credits=240,loyalty_bonus_credits=20,enabled=true where code='pack208'",
  );
  await member(admin, async () => {
    await value("select market_save_offer('monthly208',240,20800,true)");
    await value("select market_save_offer('pack104',110,10400,true)");
  });
  await assert.rejects(
    member(loyaltyPro, () =>
      value(invoiceSql, [id(), "in_denied", 20800, "sub_denied", boundary(1), boundary(2)]),
    ),
    /permission denied/,
  );
  const subscription = await loyaltyPurchase("monthly208"),
    subId = "sub_loyalty";
  assert.equal(subscription.price_cents, 20800);
  assert.equal(subscription.credits, 240);
  await assert.rejects(credit(subscription, "in_missing_period", 20800, subId));
  const packs = [];
  for (let i = 0; i < 4; i++) packs.push(await loyaltyPurchase("pack208"));
  await expectCredit(240, () => payPack(packs[0]));
  await expectCredit(0, () => payPack(packs[0]));
  await expectCredit(240, () => payMonth(subscription, subId, 1));
  await expectCredit(110, async () => payPack(await loyaltyPurchase("pack104")));
  await expectCredit(240, () => payPack(packs[1]));
  await db.exec("update market_billing.settings set preview_checkout_enabled=true");
  await assert.rejects(simulate(subscription));
  for (const expected of [240, 240, 260]) {
    const simulated = await loyaltyPurchase("pack208");
    await expectCredit(expected, () => simulate(simulated));
    await expectCredit(0, () => simulate(simulated));
  }
  await db.exec("update market_billing.settings set preview_checkout_enabled=false");
  await expectCredit(260, () => payPack(packs[2]));
  await expectCredit(0, () => payPack(packs[2]));
  await expectCredit(260, () => payPack(packs[3]));
  // A different provider starts a separate count and keeps their partner discount.
  const otherPack = await purchase("pack208");
  assert.equal(otherPack.price_cents, 18720);
  const otherBalance = await balance();
  await payPack(otherPack);
  assert.equal(await balance(), otherBalance + 240);

  // March arrives before February. When the missing period arrives, March earns its bonus.
  await expectCredit(240, () => payMonth(subscription, subId, 3));
  await expectCredit(260, () => payMonth(subscription, subId, 2));
  await expectCredit(0, () => payMonth(subscription, subId, 3));
  await expectCredit(0, () =>
    operator(() =>
      value(invoiceSql, [
        subscription.id,
        "in_another_id_same_period",
        20800,
        subId,
        boundary(3),
        boundary(4),
      ]),
    ),
  );
  await assert.rejects(
    operator(() =>
      value(invoiceSql, [
        subscription.id,
        "in_" + subId + "_3",
        20800,
        subId,
        boundary(4),
        boundary(5),
      ]),
    ),
  );
  await assert.rejects(
    operator(() =>
      value(invoiceSql, [
        subscription.id,
        "in_nonpositive_period",
        20800,
        subId,
        boundary(4),
        boundary(4),
      ]),
    ),
  );
  await expectCredit(260, () => payMonth(subscription, subId, 4));
  // May was not paid. The three consecutive cycles now start in June.
  await expectCredit(240, () => payMonth(subscription, subId, 6));
  await expectCredit(240, () => payMonth(subscription, subId, 7));
  await expectCredit(260, () => payMonth(subscription, subId, 8));
  await operator(() =>
    value("select market_subscription_state($1,$2,'cus_loyalty','canceled',10)", [
      subscription.id,
      subId,
    ]),
  );
  const rejoined = await loyaltyPurchase("monthly208");
  assert.notEqual(rejoined.id, subscription.id);
  await expectCredit(240, () => payMonth(rejoined, "sub_rejoined", 9));
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone text,phone_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.admin_users(id uuid primary key,is_active boolean);
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text,metadata jsonb);`);
  for (const migration of [
    "20261123041042_professional_onboarding",
    "20261123075205_marketplace",
    "20261123075212_marketplace_billing",
    "20261123080102_marketplace_subscription_retry",
  ]) {
    await migrate(migration);
  }
  await query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'loyalty@example.test',now())",
    [loyaltyPro],
  );
  await query(
    "insert into professional_accounts(id,user_id,email,review_status) values($1,$2,'loyalty@example.test','approved')",
    [loyaltyAccount, loyaltyPro],
  );
  await query("update market_billing.offers set credits=208,enabled=true where code='pack208'");
  const historicalPaid = await loyaltyPurchase("pack208"),
    historicalOpen = await loyaltyPurchase("pack208");
  await credit(historicalPaid, "cs_" + historicalPaid.id, 20800);
  await migrate("20261123185435_market_loyalty_208");
  for (const uid of [admin, pro, client])
    await query("insert into auth.users(id,email,email_confirmed_at) values($1,'example@omsg.test',now())", [
      uid,
    ]);
  await query("insert into admin_users values($1,true)", [admin]);
  await query(
    "insert into professional_accounts(id,user_id,email,business_name,review_status) values($1,$2,'test@omsg.test','Pro','approved')",
    [account, pro],
  );
  await member(client, () =>
    value("select market_create_request($1,'cleaning','Ottawa','Carpet','One room','week','{}')", [
      request,
    ]),
  );
  await assert.rejects(unlock(), /price_changed/);
  await assert.rejects(purchase("pack52"), /offer_unavailable/);
  await assert.rejects(member(pro, () => value("select market_set_tariff('cleaning',1)")), /admin_required/);
  await member(admin, async () => {
    await value("select market_set_tariff('cleaning',3)");
    await assert.rejects(value("select market_save_offer('pack52',20,5100,true)"), /constraint/);
    await value("select market_save_offer('pack52',20,5200,true)");
    await value("select market_save_offer('monthly',12,3200,true)");
    await value("select market_set_discount($1,10)", [account]);
  });
  await assert.rejects(unlock(1), /price_changed/);
  await assert.rejects(unlock(), /insufficient_credits/);
  assert.equal(await value("select count(*)::int from market_private.contacts"), 0);
  assert.equal(await value("select count(*)::int from market_private.notifications where kind='contact'"), 0);
  const attempt = id(),
    order = await purchase("pack52", attempt);
  assert.equal(order.price_cents, 4680);
  assert.equal((await purchase("pack52", attempt)).id, order.id);
  await assert.rejects(
    member(pro, () => value("select market_checkout_simulate($1)", [order.id])),
    /permission denied/,
  );
  await assert.rejects(simulate(order), /simulation_disabled/);
  await db.exec("update market_billing.settings set preview_checkout_enabled=true");
  await simulate(order);
  await simulate(order);
  assert.equal(await balance(), 20);
  await db.exec("update market_billing.settings set preview_checkout_enabled=false");
  const contact = await unlock();
  assert.equal(await unlock(), contact);
  assert.equal(await balance(), 17);
  assert.equal(
    await value("select count(*)::int from market_private.notifications where kind='contact'"),
    1,
  );
  await member(pro, () =>
    value("select market_request_refund($1,'invalid_phone','Unreachable number')", [contact]),
  );
  await assert.rejects(
    member(pro, () => value("select market_review_refund($1,true,'checked')", [contact])),
    /admin_required/,
  );
  await member(admin, async () => {
    const overview = await value("select market_billing_admin()");
    assert.equal(overview.refunds[0].request_note, "Unreachable number");
    await value("select market_review_refund($1,true,'number checked')", [contact]);
    await value("select market_review_refund($1,true,'number checked')", [contact]);
    await assert.rejects(
      value("select market_review_refund($1,false,'declined')", [contact]),
      /already_reviewed/,
    );
  });
  assert.equal(await balance(), 20);
  const paid = await purchase("pack52");
  await assert.rejects(credit(paid, "cs_test", 3), /payment_mismatch/);
  await credit(paid, "cs_test", 4680);
  await credit(paid, "cs_test", 4680);
  assert.equal(await balance(), 40);
  const monthly = await purchase("monthly");
  assert.equal((await purchase("monthly")).id, monthly.id);
  await credit(monthly, "in_first", 2880, "sub_1");
  await credit(monthly, "in_first", 2880, "sub_1");
  await credit(monthly, "in_next", 2880, "sub_1");
  assert.equal(await balance(), 64);
  await assert.rejects(purchase("monthly"), /subscription_exists/);
  await operator(() =>
    value("select market_subscription_state($1,'sub_1','cus_test','canceled',2)", [monthly.id]),
  );
  await operator(() =>
    value("select market_subscription_state($1,'sub_1','cus_test','active',1)", [monthly.id]),
  );
  const abandoned = await purchase("monthly");
  assert.notEqual(abandoned.id, monthly.id);
  await operator(() => value("select market_checkout_link($1,'cs_pending',false)", [abandoned.id]));
  await query("update market_billing.orders set expires_at=now()-interval '5 minutes' where id=$1", [
    abandoned.id,
  ]);
  assert.equal((await purchase("monthly")).id, abandoned.id);
  await operator(() => value("select market_checkout_link($1,'cs_pending',true)", [abandoned.id]));
  assert.notEqual((await purchase("monthly")).id, abandoned.id);
  await assert.rejects(
    member(pro, () => query("select * from market_billing.ledger")),
    /permission denied/,
  );
  await test208Loyalty(historicalPaid, historicalOpen);
  await migrate("20261123191753_market_public_credit_offers");
  const publicCatalog = () => value("select public.market_public_credit_offers()");
  await query("update market_billing.offers set enabled=false");
  assert.deepEqual(await role("anon", null, publicCatalog), []);
  await query("update market_billing.offers set enabled=true where code in ('pack104','monthly208')");
  const offers = await role("anon", null, publicCatalog);
  assert.deepEqual(offers.map((o) => [o.code, o.price_cents, o.credits, o.loyalty_bonus_credits]), [
    ["pack104", 10400, 110, 0],
    ["monthly208", 20800, 240, 20],
  ]);
  assert.deepEqual(Object.keys(offers[0]).sort(), [
    "code", "credits", "enabled", "kind", "loyalty_bonus_credits", "name", "price_cents",
  ]);
  assert.deepEqual(await member(pro, publicCatalog), offers);
  await assert.rejects(
    role("anon", null, () => query("select * from market_billing.offers")),
    /permission denied/,
  );
  console.log(
    "PASS marketplace billing: tariff snapshots, credits, refunds, subscriptions and independent pack/monthly 208 loyalty with duplicate, gapped and out-of-order payments.",
  );
} finally {
  await db.close();
}
