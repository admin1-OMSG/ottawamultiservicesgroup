import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("the scheduler issues an expiring single-use ticket and SMS reservations belong to the current lease", async () => {
  const db=new PGlite();
  try {
    // Only pg_net is stubbed in WASM. No external providers.
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema market_private; grant usage on schema market_private to authenticated,service_role;
      create table market_private.notifications(id uuid primary key, delivered_at timestamptz, retry_at timestamptz default now(), lease uuid, attempts int default 1);
      create schema net; create table net.outbox(url text,headers jsonb);
      create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$
        insert into net.outbox values($1,$2) returning 1::bigint; $$;
    `);
    const sql=readFileSync(new URL("../../supabase/migrations/20261123075645_market_notification_dispatch.sql",import.meta.url),"utf8");
    await db.exec(sql.replace(/^create extension if not exists .+;$/gm,""));
    const read=(q,args=[])=>db.query(q,args).then(r=>r.rows);
    const value=(q,args=[])=>read(q,args).then(rows=>Object.values(rows[0])[0]);
    const as=async(role,fn)=>{await db.exec("set role "+role);try{return await fn()}finally{await db.exec("reset role")}};
    const id=randomUUID(),lease=randomUUID(),attempt=randomUUID();
    const consume=(token)=>as("service_role",()=>value("select public.market_consume_dispatch_ticket($1)",[token]));
    await db.query("insert into market_private.notifications(id,lease) values($1,$2)",[id,lease]);
    await db.exec("select market_private.schedule_dispatch()");
    assert.equal(await value("select count(*) from net.outbox"),0);
    await db.exec("insert into market_private.dispatch_config(project_ref) values('vdeeevxpwjvztsoonuxx'); select market_private.schedule_dispatch()");
    const [out]=await read("select * from net.outbox");
    assert.equal(out.url,"https://vdeeevxpwjvztsoonuxx.supabase.co/functions/v1/market-dispatch");
    const key=out.headers["X-Market-Ticket"]; assert.match(key,/^[0-9a-f]{64}$/);
    for (const role of ["anon","authenticated"]) {
      await assert.rejects(()=>as(role,()=>db.exec("select market_private.schedule_dispatch()")),/permission denied/);
      await assert.rejects(()=>as(role,()=>value("select public.market_consume_dispatch_ticket($1)",[key])),/permission denied/);
      await assert.rejects(()=>as(role,()=>db.exec("select * from market_private.sms_attempts")),/permission denied/);
    }
    assert.equal(await consume(key),true); assert.equal(await consume(key),false);
    await db.exec("select market_private.schedule_dispatch(); update market_private.dispatch_tickets set expires_at=now()-interval '1 second'");
    const other=await value("select headers->>'X-Market-Ticket' from net.outbox where headers->>'X-Market-Ticket'<>$1",[key]);
    assert.equal(await consume(other),false);
    const reserve=(l,a)=>as("service_role",()=>value("select public.market_reserve_sms($1,$2,$3)",[id,l,a]));
    const result=(a,state,sid=null)=>as("service_role",()=>value("select public.market_sms_result($1,$2,$3,$4)",[id,a,state,sid]));
    const sid="SM"+"a".repeat(32);
    assert.equal(await reserve(randomUUID(),attempt),false);
    assert.equal(await reserve(lease,attempt),true); assert.equal(await reserve(lease,randomUUID()),false);
    assert.equal(await result(randomUUID(),"accepted",sid),false);
    assert.equal(await result(attempt,"rejected"),true);
    const next=randomUUID(),nextAttempt=randomUUID();
    await db.query("update market_private.notifications set lease=$2 where id=$1",[id,next]);
    assert.equal(await reserve(next,nextAttempt),true);
    assert.equal(await result(attempt,"accepted",sid),false);
    assert.equal(await result(nextAttempt,"accepted",sid),true);
    assert.equal(await value("select delivered_at is not null from market_private.notifications"),true);
    assert.equal(await result(nextAttempt,"failed",sid),true);
    assert.equal(await result(nextAttempt,"accepted",sid),false);
    assert.equal(await value("select delivered_at is null and retry_at='infinity' from market_private.notifications"),true);
  } finally {await db.close();}
});
