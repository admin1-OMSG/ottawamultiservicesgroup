import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const rows = async (query, args = []) => (await db.query(query, args)).rows;
const value = async (query, args = []) => Object.values((await rows(query, args))[0])[0];
const migrate = async name => db.exec(await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8"));

async function as(role, uid, fn) {
  await db.exec("set role " + role);
  await rows("select set_config('request.jwt.claim.sub',$1,false)", [uid || ""]);
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const auth = (id, fn) => as("authenticated", id, fn);
const client = randomUUID(), phoneClient = randomUUID(), unverified = randomUUID(), admin = randomUUID();
const near = randomUUID(), far = randomUUID(), draft = randomUUID();
const nearId = randomUUID(), farId = randomUUID(), draftId = randomUUID();
const request = randomUUID();
const create = (id, preferred = []) => value(
  "select public.market_create_request($1,'cleaning','Orléans','Windows','Second floor','week',$2)", [id, preferred]
);
const unlock = id => value("select public.market_unlock($1,3)", [id]);

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone text,phone_confirmed_at timestamptz,
      is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.admin_users(id uuid primary key references auth.users(id),is_active boolean);
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    grant usage on schema storage to anon,authenticated;
    grant all on storage.objects to anon,authenticated;
  `);
  await migrate("20261123041042_professional_onboarding.sql");
  await migrate("20261123075205_marketplace.sql");
  await migrate("20261123075212_marketplace_billing.sql");
  await migrate("20261123075858_market_request_withdrawal.sql");
  await migrate("20261123080102_marketplace_subscription_retry.sql");
  await migrate("20261123160426_market_notification_inbox.sql");
  await migrate("20261123185435_market_loyalty_208.sql");
  await rows("insert into market_billing.tariffs(service,credits) values('cleaning',3)");
  for (const id of [client, phoneClient, unverified, admin, near, far, draft]) {
    await rows(`insert into auth.users(id,email,email_confirmed_at,phone,phone_confirmed_at)
      values($1,$2,case when $3 then now() end,$4,case when $5 then now() end)`,
      [id,id + "@example.test",id!==phoneClient && id!==unverified,id===phoneClient?"+16135550117":null,id===phoneClient]);
  }
  for (const [id,user,label,areas,status] of [[nearId,near,"Local",["Ottawa"],"approved"],
    [farId,far,"Remote",["Toronto"],"approved"],[draftId,draft,"Draft",["Orléans"],"draft"]]) {
    await rows(`insert into public.professional_accounts(id,user_id,email,business_name,services,service_areas,review_status)
      values($1,$2,$3,$4,$5,$6,$7)`, [id,user,user+"@example.test",label,["cleaning"],areas,status]);
  }
  await rows("insert into market_billing.wallets(provider_id,balance) values($1,30),($2,30)",[nearId,farId]);
  await rows("insert into public.admin_users values($1,true)",[admin]);
  await as("anon",null,()=>assert.rejects(create(request),/permission denied/));
  await auth(unverified,()=>assert.rejects(create(request),/verified_contact_required/));
  await auth(client,async()=>{
    await assert.rejects(create(request,[draftId]),/preferred_unavailable/);
    assert.equal(await create(request,[farId]),request);
    assert.equal(await create(request,[farId]),request);
    const req=(await rows("select * from public.market_requests()"))[0];
    assert.equal(req.credit_cost,3);
    assert.deepEqual(req.preferred_ids,[farId]);
    assert.equal(req.email_verified,true);
  });
  await auth(unverified,async()=>{
    assert.deepEqual(await rows("select * from public.market_requests()"),[]);
    await assert.rejects(rows("select * from market_private.contacts"),/permission denied/);
    await assert.rejects(rows("select * from public.market_claim_deliveries(20)"),/permission denied/);
  });
  assert.equal(await value("select count(*)::int from market_private.notifications"),2);
  for(const [user,kind] of [[near,"match"],[far,"invitation"]]) {
    await auth(user,async()=>{
      const lead=(await rows("select * from public.market_requests()"))[0];
      assert.deepEqual(lead.preferred_ids,[]);
      assert.equal(lead.matched,user===near);
      assert.equal(lead.invited,user===far);
      const notice=(await rows("select * from public.market_notifications()"))[0];
      assert.equal(notice.kind,kind);
      await rows("select public.market_read_notification($1)",[notice.id]);
      assert.ok(await value("select read_at from public.market_notifications()"));
    });
  }
  await auth(far,()=>assert.rejects(rows("select public.market_invite($1,$2)",[request,nearId]),/request_unavailable/));
  await auth(client,async()=>{
    await rows("select public.market_invite($1,$2)",[request,nearId]);
    await rows("select public.market_invite($1,$2)",[request,nearId]);
    assert.equal((await value("select preferred_ids from public.market_requests()")).length,2);
  });
  const contact=await auth(near,()=>unlock(request));
  const competing=await auth(far,()=>unlock(request));
  assert.equal(await auth(near,()=>unlock(request)),contact);
  await auth(near,async()=>{
    assert.equal(await value("select client_email from public.market_my_contacts()"),client+"@example.test");
    const message=randomUUID();
    for(let i=0;i<2;i++) assert.equal(await value("select public.market_send_message($1,$2,'Hello')",[contact,message]),message);
    await assert.rejects(rows("select public.market_review($1,5,'')",[contact]),/completed_work_required/);
  });
  await auth(far,async()=>{
    assert.deepEqual(await rows("select * from public.market_messages($1)",[contact]),[]);
    await assert.rejects(rows("select public.market_send_message($1,$2,'Hello')",[contact,randomUUID()]),/conversation_unavailable/);
  });
  await auth(client,async()=>{
    const messages=await rows("select * from public.market_messages($1)",[contact]);
    assert.equal(messages.length,1);
    assert.equal(messages[0].mine,false);
    const notifications=await rows("select * from public.market_notifications()");
    assert.equal(notifications.filter(n=>n.kind==="contact").length,2);
    assert.equal(notifications.filter(n=>n.kind==="message").length,1);
    await rows("select public.market_complete($1)",[contact]);
    await rows("select public.market_complete($1)",[contact]);
    await assert.rejects(rows("select public.market_complete($1)",[competing]),/already_completed/);
    await rows("select public.market_review($1,5,'On time')",[contact]);
    const directory=await rows("select * from public.market_directory()");
    assert.ok(!directory.some(p=>p.id===draftId));
    const pro=directory.find(p=>p.id===nearId);
    assert.equal(pro.completed_count,1);
    assert.equal(pro.review_count,1);
    assert.equal(Number(pro.average_rating),5);
    await assert.rejects(rows("select public.market_withdraw($1)",[request]),/request_closed/);
  });
  const byPhone=randomUUID();
  await auth(phoneClient,async()=>{
    await create(byPhone);
    const req=(await rows("select * from public.market_requests() where id=$1",[byPhone]))[0];
    assert.equal(req.email_verified,false);
    assert.equal(req.phone_verified,true);
  });
  await auth(near,()=>unlock(byPhone));
  await as("service_role",null,async()=>{
    const sms=await rows("select * from public.market_claim_deliveries(100,false,true)");
    assert.equal(sms.length,1);
    assert.equal(sms[0].phone,"+16135550117");
    assert.equal(sms[0].email,null);
    const [job]=await rows("select * from public.market_claim_deliveries(100,true,false)");
    assert.deepEqual(await rows("select * from public.market_claim_deliveries(100)"),[]);
    assert.equal(await value("select public.market_finish_delivery($1,$2,true)",[job.id,randomUUID()]),false);
    assert.equal(await value("select public.market_finish_delivery($1,$2,true)",[job.id,job.lease]),true);
    assert.equal(await value("select public.market_finish_delivery($1,$2,true)",[job.id,job.lease]),false);
  });
  for(const reason of ["owner","request_in_error"]) {
    const id=randomUUID();
    await auth(client,()=>create(id));
    const thread=await auth(near,()=>unlock(id));
    if(reason==="owner") {
      await auth(far,()=>assert.rejects(rows("select public.market_withdraw($1)",[id]),/request_unavailable/));
      await auth(client,()=>rows("select public.market_withdraw($1)",[id]));
      await auth(client,()=>rows("select public.market_withdraw($1)",[id]));
    } else {
      await auth(near,()=>rows("select public.market_request_refund($1,'request_in_error','Customer requested')",[thread]));
      await auth(admin,()=>rows("select public.market_review_refund($1,true,'Confirmed with customer')",[thread]));
      assert.equal(await value("select count(*)::int from market_billing.ledger where source=$1",["refund:"+thread]),1);
    }
    assert.equal(await value("select status from market_private.requests where id=$1",[id]),"withdrawn");
    await auth(client,()=>assert.rejects(rows("select public.market_complete($1)",[thread]),/request_closed/));
    await auth(far,()=>assert.rejects(unlock(id),/request_closed/));
    assert.equal(await auth(near,()=>unlock(id)),thread);
  }
  // The same signed-in user can post as a customer and reply as a professional.
  const ownRequest=randomUUID();
  await auth(near,()=>create(ownRequest,[farId]));
  const incoming=await auth(far,()=>unlock(ownRequest));
  await auth(far,()=>value("select public.market_send_message($1,$2,'Available Monday')",[incoming,randomUUID()]));
  await auth(phoneClient,async()=>{
    const proThread=await value("select id from public.market_my_contacts() where request_id=$1",[byPhone]);
    await rows("select public.market_send_message($1,gen_random_uuid(),'Next week?') from generate_series(1,29)",[proThread]);
  });
  const inbox=(asProvider,includeItems=true,before=null)=>value("select public.market_inbox($1,$2,$3,$4)",
    [asProvider,includeItems,before?.created_at??null,before?.id??null]);
  await as("anon",null,()=>assert.rejects(inbox(true),/permission denied/));
  await auth(near,async()=>{
    const customer=await inbox(false);
    assert.deepEqual(customer.items.map(n=>n.kind).sort(),["contact","message"]);
    assert.ok(customer.items.every(n=>n.request_id===ownRequest && n.provider_name==="Remote"));
    const pro=await inbox(true);
    assert.equal(pro.items.length,25);
    assert.ok(pro.has_older);
    assert.deepEqual(await inbox(true,false),{items:[],unread:pro.unread,has_older:false});
    const older=await inbox(true,true,pro.items.at(-1));
    const all=[...pro.items,...older.items];
    assert.equal(older.has_older,false);
    assert.equal(new Set(all.map(n=>n.id)).size,all.length);
    assert.equal(all.filter(n=>n.kind==="message").length,29);
    assert.ok(all.every(n=>n.request_id===byPhone));
    assert.equal(pro.unread,all.filter(n=>!n.read_at).length);
    await rows("select public.market_read_notification($1)",[customer.items[0].id]);
    assert.equal((await inbox(false,false)).unread,customer.unread-1);
    assert.equal((await inbox(true,false)).unread,pro.unread);
  });
  await rows("update professional_accounts set review_status='draft' where id=$1",[nearId]);
  await auth(near,async()=>{
    assert.deepEqual(await inbox(true),{items:[],unread:0,has_older:false});
    assert.equal((await inbox(false)).items.length,2);
  });
  console.log("PASS verified contacts, matching, invitations, message privacy, idempotent debits, ratings, worker leases, withdrawals and reviewed refunds.");
} finally {
  await db.close();
}
