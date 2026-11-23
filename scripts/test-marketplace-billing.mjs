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
    await db.exec(
      await readFile(new URL("../supabase/migrations/" + migration + ".sql", import.meta.url), "utf8"),
    );
  }
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
  console.log(
    "PASS marketplace billing: tariff snapshot, insufficient credit rollback, preview gate, purchase/contact idempotency, notification, refund approval, discounted packs, subscription cycles and out-of-order cancellation.",
  );
} finally {
  await db.close();
}
