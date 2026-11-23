// Keep the disposable Postgres process separate from the browser's jsdom environment.
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const db = new PGlite();
const users = {};
const provider = randomUUID();
const query = async(q,a=[]) => (await db.query(q,a)).rows;
const scalar = async(q,a=[]) => Object.values((await query(q,a))[0])[0];
async function init(){
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone text, phone_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;
 create table public.admin_users(id uuid primary key references auth.users(id),is_active boolean); grant select on public.admin_users to authenticated;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 grant usage on schema storage to anon,authenticated; grant all on storage.objects to anon,authenticated;`);
 const folder=path.join(repo,'supabase/migrations');
 for(const match of ['_professional_onboarding.sql','_marketplace.sql','_marketplace_billing.sql','_professional_google_maps_link.sql']){
  const name=fs.readdirSync(folder).find(f=>f.endsWith(match));
  await db.exec(fs.readFileSync(path.join(folder,name),'utf8'));
 }
 for(const role of ['client','pro','admin']){
  const id=randomUUID();
  users[role]={id,email:role+'@example.test',phone:'',role:'authenticated',aud:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},email_confirmed_at:new Date().toISOString(),identities:[],created_at:new Date().toISOString()};
  await query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,users[role].email]);
 }
 await query("insert into professional_accounts(id,user_id,email,business_name,city,services,service_areas,review_status) values($1,$2,$3,'Éclat Ottawa','Ottawa',array['cleaning'],array['Ottawa'],'approved')",[provider,users.pro.id,users.pro.email]);
 await query('insert into public.admin_users values ($1,true)',[users.admin.id]);
 await db.exec("update market_billing.settings set preview_checkout_enabled=true; update market_billing.offers set credits=case code when 'pack52' then 12 when 'pack104' then 24 else 48 end,enabled=true where kind='pack'; insert into market_billing.tariffs values('cleaning',3);");
}
const scalarRpcs = new Set(['market_touch','market_create_request','market_wallet','market_unlock','market_read_notification','market_send_message','market_complete','market_review','market_request_refund','market_review_refund','market_billing_admin']);
async function execute({op,role,method,args={}}) {
 if(op==='init') {await init(); return users;}
 if(op==='profile') return (await query('select id,business_name,contact_name,review_status from professional_accounts where user_id=$1',[users[role].id]))[0];
 if(op==='state') return {
  contacts:await scalar('select count(*)::int from market_private.contacts'),
  balance:Number(await scalar('select coalesce(sum(balance),0) from market_billing.wallets')),
  reviews:await scalar('select count(*)::int from market_private.reviews'),
  refunds:await scalar("select count(*)::int from market_billing.ledger where source like 'refund:%'"),
  notifications:await scalar('select count(*)::int from market_private.notifications'),
 };
 if(op==='checkout') {
  await db.exec('set role service_role');
  try {
   const order=await scalar('select public.market_checkout_begin($1,$2,$3,$4)',[users[role].id,args.offer_code,args.attempt_id,args.return_request_id]);
   await scalar('select public.market_checkout_simulate($1)',[order.id]);
   return {lead:args.return_request_id};
  } finally {await db.exec('reset role');}
 }
 if(op!=='rpc'||!/^market_[a-z_]+$/.test(method)||Object.keys(args).some(k=>!/^p_[a-z_]+$/.test(k)))throw Error('invalid_test_operation');
 await db.exec('set role authenticated');await query("select set_config('request.jwt.claim.sub',$1,false)",[users[role].id]);
 const call='public.'+method+'('+Object.keys(args).map((k,i)=>k+' => $'+(i+1)).join(',')+')';
 try {return scalarRpcs.has(method)?await scalar('select '+call,Object.values(args)):await query('select * from '+call,Object.values(args));}
 finally {await db.exec('reset role');}
}
const input=createInterface({input:process.stdin});
for await (const line of input) {
 const {id,...request}=JSON.parse(line);
 try {const data=await execute(request);console.log(JSON.stringify({id,data}));}
 catch(err){console.log(JSON.stringify({id,error:err.message}));}
}
await db.close();
