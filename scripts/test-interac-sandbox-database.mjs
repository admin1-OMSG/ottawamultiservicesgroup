import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Exercise the actual migration, including function grants, as each caller.
const db = new PGlite();
const migration = readFileSync(
  new URL("../supabase/migrations/20261123062750_interac_sandbox_identity.sql", import.meta.url),
  "utf8",
);
const pro = randomUUID();
const other = randomUUID();
const noProfile = randomUUID();
const unconfirmed = randomUUID();
const suspended = randomUUID();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const nonce = "n".repeat(32);
const verifier = "v".repeat(64);
const browser = hash("test-browser");
const query = async (sql, args = []) => (await db.query(sql, args)).rows;

async function as(role, uid, fn) {
  await db.exec(`set role ${role}`);
  try {
    await query("select set_config('request.jwt.claim.sub',$1,false)", [uid ?? ""]);
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
const service = (fn) => as("service_role", null, fn);
async function start(uid, s) {
  const rows = await query("select public.interac_sandbox_start($1,$2,$3,$4,$5) as id", [
    uid, hash(s), browser, nonce, verifier,
  ]);
  return rows[0].id;
}
const claim = (s, b = browser) => query("select * from public.interac_sandbox_claim($1,$2)", [hash(s), b]);
const finish = async (id, outcome) => (await query("select public.interac_sandbox_finish($1,$2) as ok", [id, outcome]))[0].ok;
const state = async (uid) => (await as("authenticated", uid, () => query("select * from public.get_my_interac_sandbox_status()")))[0];

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz, is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.professional_accounts(
      user_id uuid unique references auth.users(id) on delete cascade,
      review_status text not null default 'approved'
    );
  `);
  for (const uid of [pro, other, noProfile, unconfirmed, suspended]) {
    await query("insert into auth.users(id,email_confirmed_at) values ($1,$2)", [
      uid, uid === unconfirmed ? null : new Date().toISOString(),
    ]);
    if (uid !== noProfile) {
      await query("insert into public.professional_accounts values ($1,$2)", [uid, uid === suspended ? "suspended" : "approved"]);
    }
  }
  await db.exec(migration);

  for (const role of ["anon", "authenticated"]) {
    await as(role, pro, async () => {
      await assert.rejects(() => query("select * from interac_private.sandbox_attempts"), /permission denied/);
      await assert.rejects(() => start(other, "forbidden"), /permission denied/);
      await assert.rejects(() => claim("forbidden"), /permission denied/);
      await assert.rejects(() => finish(randomUUID(), "verified"), /permission denied/);
    });
  }
  await as("anon", null, () => assert.rejects(() => query("select * from public.get_my_interac_sandbox_status()"), /permission denied/));
  for (const uid of [noProfile, unconfirmed, suspended]) {
    await assert.rejects(() => service(() => start(uid, "blocked")), /interac_sandbox_profile_required/);
  }
  assert.deepEqual(await state(pro), { status: "not_started", updated_at: null });

  const first = await service(() => start(pro, "first"));
  assert.equal((await state(pro)).status, "pending");
  assert.equal((await state(other)).status, "not_started");
  assert.equal(await service(() => finish(first, "verified")), false);
  assert.deepEqual(await service(() => claim("first", hash("different browser"))), []);
  assert.deepEqual(await service(() => claim("first")), [{ attempt_id: first, user_id: pro, nonce, verifier }]);
  assert.deepEqual(await service(() => claim("first")), []);
  assert.deepEqual((await query("select nonce, verifier, browser_hash from interac_private.sandbox_attempts where id=$1", [first]))[0], {
    nonce: null, verifier: null, browser_hash: null,
  });
  await service(() => start(pro, "second"));
  assert.equal(await service(() => finish(first, "verified")), false, "previous in-flight exchange cannot overwrite a new attempt");
  const second = (await service(() => claim("second")))[0].attempt_id;
  await assert.rejects(() => service(() => finish(second, "invalid")), /interac_sandbox_invalid_outcome/);
  assert.equal(await service(() => finish(second, "failed")), true);
  assert.equal((await state(pro)).status, "failed");
  assert.equal(await service(() => finish(second, "verified")), false);

  const third = await service(() => start(pro, "third"));
  await query("update interac_private.sandbox_attempts set expires_at=now()-interval '1 second' where id=$1", [third]);
  assert.equal((await state(pro)).status, "expired");
  assert.deepEqual(await service(() => claim("third")), []);
  assert.equal((await state(pro)).status, "expired");

  const fourth = await service(() => start(pro, "fourth"));
  await service(() => claim("fourth"));
  await query("update interac_private.sandbox_attempts set updated_at=now()-interval '3 minutes' where id=$1", [fourth]);
  assert.equal((await state(pro)).status, "expired");
  assert.equal(await service(() => finish(fourth, "verified")), false);
  const fifth = await service(() => start(pro, "fifth"));
  await assert.rejects(() => service(() => start(pro, "sixth")), /interac_sandbox_rate_limited/);
  assert.deepEqual(await service(() => claim("fifth")), [{ attempt_id: fifth, user_id: pro, nonce, verifier }]);
  assert.equal(await service(() => finish(fifth, "verified")), true);
  assert.equal(await service(() => finish(fifth, "failed")), false);
  assert.equal((await state(pro)).status, "verified");
  assert.equal((await state(other)).status, "not_started");
  await assert.rejects(() => service(() => start(pro, "again")), /interac_sandbox_already_verified/);
  assert.equal((await query("select review_status from public.professional_accounts where user_id=$1", [pro]))[0].review_status, "approved");
  console.log("PASS Interac sandbox RPC grants, verified profiles, browser binding, single use, supersession, time limits, rate limits, private status and terminal results");
} finally {
  await db.close();
}
