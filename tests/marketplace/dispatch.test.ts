import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createDispatcher } from "../../supabase/functions/market-dispatch/index.ts";

const origin = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const branchSite = "https://ottawamultiservicesgroup-git-codex-professional-onboarding-omsg.vercel.app";
const endpoint = origin + "/functions/v1/market-dispatch";
const recipient = "owner@example.test";
const phone = "+16135550100";
const token = "a".repeat(64);
const config = {
  SUPABASE_URL: origin, SUPABASE_SERVICE_ROLE_KEY:"test-service", MARKET_DISPATCH_ENV:"preview",
  MARKET_PREVIEW_RECIPIENTS:recipient+","+phone,
  MARKET_RESEND_API_KEY:"test-email", MARKET_MAIL_FROM:"notices@example.test",
  MARKET_TWILIO_ACCOUNT_SID:"AC"+"a".repeat(32), MARKET_TWILIO_AUTH_TOKEN:"test-sms",
  MARKET_TWILIO_FROM:"+16135550101",
};
const notification = {
  id:randomUUID(), lease:randomUUID(), kind:"contact",email:recipient,phone,locale:"fr",
  request_id:randomUUID(),contact_id:randomUUID(),provider_name:"Atelier Ottawa",service:"cleaning",
  recipient_is_provider:false,
};
type Captured = {url:string, init?:RequestInit};
function setup(opts:{
  settings?: Record<string,string>,rows?:object[],reserve?:boolean,
  send?:(call:Captured)=>Response, validated?:boolean
}={}) {
  const settings = {...config,...opts.settings};
  const calls:Captured[]=[];
  let consumed = false;
  const handler = createDispatcher(k=>settings[k as keyof typeof settings],async(input,init) => {
    const call = {url:String(input),init}; calls.push(call);
    assert.equal(init?.redirect,"error");
    if (call.url.startsWith(origin+"/rest/v1/rpc/")) {
      assert.equal(new Headers(init?.headers).get("apikey"),config.SUPABASE_SERVICE_ROLE_KEY);
      if (call.url.endsWith("/market_consume_dispatch_ticket")) {
        const allowed=!consumed && opts.validated!==false;
        consumed=true; return Response.json(allowed);
      }
      if (call.url.endsWith("/market_claim_deliveries")) return Response.json(opts.rows||[notification]);
      if (call.url.endsWith("/market_reserve_sms")) return Response.json(opts.reserve!==false);
      if (call.url.endsWith("/market_finish_delivery") || call.url.endsWith("/market_sms_result")) return Response.json(true);
      throw new Error("unexpected RPC");
    }
    assert.equal(new Headers(init?.headers).get("apikey"),null);
    assert.ok(!JSON.stringify(call).includes(config.SUPABASE_SERVICE_ROLE_KEY));
    return opts.send?.(call)||Response.json({id:randomUUID()});
  });
  const run = (headers:Record<string,string>={"X-Market-Ticket":token}) => handler(new Request(endpoint,{method:"POST",headers}));
  const by = (suffix:string) => calls.filter(c=>c.url.endsWith(suffix));
  const rpcArgs=(suffix:string) => by(suffix).map(c=>JSON.parse(String(c.init?.body)));
  return {handler,run,calls,by,rpcArgs};
}

test("unsigned, invalid, and replayed scheduler calls never claim notifications",async()=>{
  const db=setup();
  assert.equal((await db.run({})).status,401);
  assert.equal(db.calls.length,0);
  assert.equal((await setup({validated:false}).run()).status,401);
  assert.equal((await db.run()).status,204);
  assert.equal((await db.run()).status,401);
  assert.equal(db.by("/market_claim_deliveries").length,1);
});

test("readiness consumes a ticket and reports only channel availability without claiming deliveries", async () => {
  for (const [settings, enabled] of [[{}, true], [{MARKET_DISPATCH_ENV:""}, false]] as const) {
    const d = setup({ settings });
    const check = (ticket: string) => d.handler(new Request(endpoint+"/readiness", {
      method:"POST", headers:{"X-Market-Ticket":ticket},
    }));
    assert.equal((await check("")).status, 401);
    const result = await check(token);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await result.json(), {email_enabled:enabled, sms_enabled:enabled});
    assert.equal((await check(token)).status, 401);
    assert.ok(d.calls.every(call => call.url.endsWith("/market_consume_dispatch_ticket")));
  }
});

test("absent settings or wrong preview/production config never claim a notification",async()=>{
  for (const settings of [
    {MARKET_DISPATCH_ENV:""}, {MARKET_PREVIEW_RECIPIENTS:""},
    {MARKET_RESEND_API_KEY:"",MARKET_TWILIO_AUTH_TOKEN:""},
    {MARKET_DISPATCH_ENV:"production",MARKET_PRODUCTION_PROJECT_REF:"vdeeevxpwjvztsoonuxx",MARKET_SITE_ORIGIN:"https://www.ottawamultiservicesgroup.com"},
  ]) {
    const d=setup({settings}); assert.equal((await d.run()).status,204);
    assert.equal(d.by("/market_claim_deliveries").length,0);
  }
});

test("one succinct French email links directly to the conversation; retries reuse the event id",async()=>{
  const d=setup({rows:[{...notification,body:"private conversation",address:"private home"}]});
  const response=await d.run();
  assert.equal(response.status,204); assert.equal(await response.text(),"");
  const [sent]=d.by("resend.com/emails");
  assert.deepEqual(JSON.parse(String(sent.init?.body)),{from:config.MARKET_MAIL_FROM,to:[recipient],
    subject:"OMSG — Un professionnel a répondu à votre demande",text:"OMSG · Atelier Ottawa a répondu à votre demande.\n"+branchSite+"/marketplace?contact="+notification.contact_id});
  assert.equal(new Headers(sent.init?.headers).get("Idempotency-Key"),"market-notice/"+notification.id);
  assert.deepEqual(d.rpcArgs("/market_finish_delivery"),[{p_id:notification.id,p_lease:notification.lease,p_ok:true}]);
  assert.equal(d.by("/Messages.json").length,0);
});

test("non-allowlisted test audience is never contacted; provider failures remain pending",async()=>{
  const d=setup({rows:[{...notification,email:"private@example.test",phone:"+16135550199"}]});
  await d.run();
  assert.equal(d.by("/Messages.json").length+d.by("resend.com/emails").length,0);
  assert.equal(d.rpcArgs("/market_finish_delivery")[0].p_ok,false);
  const fail=setup({send:()=>new Response("PII from external sender",{status:429})});
  assert.equal(await (await fail.run()).text(),"");
  assert.equal(fail.rpcArgs("/market_finish_delivery")[0].p_ok,false);
});

test("an SMS uses the verified allowlisted number, approved-provider route, and reserved attempt",async()=>{
  const row = {...notification,email:null,phone:phone.slice(1),recipient_is_provider:true,kind:"invitation",locale:"en",contact_id:null};
  const sid="SM"+"1".repeat(32);
  const d=setup({settings:{MARKET_RESEND_API_KEY:""},rows:[row],send:()=>Response.json({sid,status:"queued"})});
  await d.run();
  const fields=new URLSearchParams(String(d.by("/Messages.json")[0].init?.body));
  assert.equal(fields.get("To"),phone);
  assert.equal(fields.get("Body"),"OMSG · A client has invited you to respond.\n"+branchSite+"/pro-market?lead="+row.request_id);
  const attempt=d.rpcArgs("/market_reserve_sms")[0].p_attempt;
  assert.equal(fields.get("StatusCallback"),endpoint+"/sms-status?id="+row.id+"&attempt="+attempt);
  assert.deepEqual(d.rpcArgs("/market_sms_result"),[{p_id:row.id,p_attempt:attempt,p_state:"accepted",p_sid:sid}]);
  assert.deepEqual(d.rpcArgs("/market_claim_deliveries"),[{p_limit:6,p_email:false,p_sms:true}]);
});

test("an ambiguous SMS creation retains the reservation and a later retry never sends it again",async()=>{
  const options = {rows:[{...notification,email:null}]};
  const first = setup({...options,send:()=>{throw Error("timeout")}});
  assert.equal((await first.run()).status,503);
  assert.equal(first.by("/market_sms_result").length,0);
  const again = setup({...options,reserve:false});
  await again.run(); assert.equal(again.by("/Messages.json").length,0);
  const rejected = setup({...options,send:()=>new Response(null,{status:429})});
  await rejected.run(); assert.equal(rejected.rpcArgs("/market_sms_result")[0].p_state,"rejected");
});

test("SMS status requires a signed callback bound to the exact path, fields, and Twilio account",async()=>{
  const sid="SM"+"b".repeat(32);
  const attempt=randomUUID();
  const path=endpoint+"/sms-status?id="+notification.id+"&attempt="+attempt;
  const fields=new URLSearchParams({AccountSid:config.MARKET_TWILIO_ACCOUNT_SID,MessageSid:sid,MessageStatus:"delivered"});
  const signature=createHmac("sha1",config.MARKET_TWILIO_AUTH_TOKEN)
    .update(path+[...fields.keys()].sort().map(k=>k+fields.get(k)).join("")).digest("base64");
  const d=setup(); const call=(url:string,sig:string)=>d.handler(new Request(url,{method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded","X-Twilio-Signature":sig},body:fields}));
  assert.equal((await call(path,"invalid")).status,403);
  assert.equal((await call(path.replace(attempt,randomUUID()),signature)).status,403);
  assert.equal((await call(path,signature)).status,204);
  assert.deepEqual(d.rpcArgs("/market_sms_result"),[{p_id:notification.id,p_attempt:attempt,p_state:"accepted",p_sid:sid}]);
  assert.equal(d.by("/market_claim_deliveries").length,0);
});
