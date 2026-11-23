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
  settings?: Record<string,string|undefined>,rows?:object[],reserve?:boolean,
  previewMail?:unknown, settingsFail?:boolean,
  send?:(call:Captured)=>Response, validated?:boolean
}={}) {
  const settings:Record<string,string|undefined> = {...config,...opts.settings};
  const envReads:string[]=[];
  const project=settings.SUPABASE_URL||origin;
  const calls:Captured[]=[];
  let consumed = false;
  const handler = createDispatcher(k=>{envReads.push(k);return settings[k];},async(input,init) => {
    const call = {url:String(input),init}; calls.push(call);
    assert.equal(init?.redirect,"error");
    if (call.url.startsWith(project+"/rest/v1/rpc/")) {
      assert.equal(new Headers(init?.headers).get("apikey"),config.SUPABASE_SERVICE_ROLE_KEY);
      if (call.url.endsWith("/market_consume_dispatch_ticket")) {
        const allowed=!consumed && opts.validated!==false;
        consumed=true; return Response.json(allowed);
      }
      if (call.url.endsWith("/market_preview_mail_settings")) {
        return opts.settingsFail ? new Response(null,{status:503}) : Response.json(opts.previewMail ?? null);
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
  const probe=(ticket=token)=>handler(new Request(project+"/functions/v1/market-dispatch/readiness",{
    method:"POST",headers:{"X-Market-Ticket":ticket},
  }));
  return {handler,run,probe,calls,by,rpcArgs,envReads};
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
    assert.deepEqual(await result.json(), enabled ? {email_enabled:true, sms_enabled:true,
      email_key_present:true,email_sender_configured:true,email_recipient_configured:true,preview_settings_lookup_failed:false} :
      {email_enabled:false,sms_enabled:false});
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


const crmSettings = { MARKET_DISPATCH_ENV:undefined, MARKET_PREVIEW_RECIPIENTS:undefined,
  MARKET_RESEND_API_KEY:undefined, MARKET_MAIL_FROM:undefined, RESEND_API_KEY:"test-crm-key" };
const previewMail = { recipient, sender:"preview@example.test" };

test("only a ticket on the pinned preview can read its CRM and DB fallback; probes report booleans without dispatch",async()=>{
  for (const mode of [undefined,"preview"]) {
    const d=setup({settings:{...crmSettings,MARKET_DISPATCH_ENV:mode},previewMail});
    assert.equal((await d.probe("")).status,401);
    assert.equal(d.calls.length,0);
    assert.ok(!d.envReads.includes("RESEND_API_KEY"));
    const res=await d.probe();
    assert.equal(res.status,200);
    assert.deepEqual(await res.json(),{email_enabled:true,sms_enabled:false,email_key_present:true,
      email_sender_configured:true,email_recipient_configured:true,preview_settings_lookup_failed:false});
    assert.deepEqual(d.calls.map(c=>c.url.split("/").at(-1)),["market_consume_dispatch_ticket","market_preview_mail_settings"]);
    assert.equal((await d.probe()).status,401);
    assert.equal(d.by("/market_preview_mail_settings").length,1);
  }
  const invalid=setup({settings:crmSettings,previewMail,validated:false});
  assert.equal((await invalid.probe()).status,401);
  assert.equal(invalid.by("/market_preview_mail_settings").length,0);
  assert.ok(!invalid.envReads.includes("RESEND_API_KEY"));
});

test("CRM fallback sends only to the exact approved recipient and accepts one safe sender",async()=>{
  for(const [setting,from] of [[undefined,previewMail.sender],["customer-service@example.test","customer-service@example.test"],
    ["OMSG <sender@example.test>","OMSG <sender@example.test>"]] as const){
    const d=setup({settings:{...crmSettings,EMAIL_FROM:setting},previewMail,
      rows:[notification,{...notification,id:randomUUID(),email:"elsewhere@example.test"},{...notification,id:randomUUID(),email:null}]});
    assert.equal((await d.run()).status,204);
    assert.deepEqual(d.rpcArgs("/market_claim_deliveries"),[{p_limit:6,p_email:true,p_sms:false}]);
    const sends=d.by("resend.com/emails");assert.equal(sends.length,1);
    assert.deepEqual(JSON.parse(String(sends[0].init?.body)).to,[recipient]);
    assert.equal(JSON.parse(String(sends[0].init?.body)).from,from);
    assert.equal(new Headers(sends[0].init?.headers).get("Authorization"),"Bearer "+crmSettings.RESEND_API_KEY);
    assert.equal(d.by("/Messages.json").length,0);
  }
});

test("explicit recipients and sender take precedence; invalid explicit values do not widen the audience",async()=>{
  const explicit=setup({settings:{...crmSettings,MARKET_DISPATCH_ENV:"preview",MARKET_PREVIEW_RECIPIENTS:recipient,MARKET_MAIL_FROM:config.MARKET_MAIL_FROM,
    EMAIL_FROM:"OMSG <ignored@example.test>"},previewMail:{recipient:"different@example.test",sender:"other@example.test"}});
  assert.equal((await explicit.run()).status,204);
  assert.equal(explicit.by("/market_preview_mail_settings").length,0);
  assert.ok(!explicit.envReads.includes("EMAIL_FROM"));
  assert.equal(JSON.parse(String(explicit.by("resend.com/emails")[0].init?.body)).from,config.MARKET_MAIL_FROM);
  const dedicated=setup({settings:{RESEND_API_KEY:"alternative",EMAIL_FROM:"ignored@example.test"}});
  await dedicated.run();
  assert.ok(!dedicated.envReads.includes("RESEND_API_KEY"));
  assert.ok(!dedicated.envReads.includes("EMAIL_FROM"));
  const source=setup({settings:{...crmSettings,MARKET_DISPATCH_ENV:"preview",MARKET_PREVIEW_RECIPIENTS:recipient},previewMail});
  assert.equal((await source.run()).status,204);
  assert.equal(source.by("/market_preview_mail_settings").length,0);
  assert.equal(source.by("/market_claim_deliveries").length,0);
  for(const value of ["",recipient+",*",recipient+"\r\n",recipient+","+phone+",bad"]) {
    const denied=setup({settings:{...crmSettings,MARKET_DISPATCH_ENV:"preview",MARKET_PREVIEW_RECIPIENTS:value},previewMail});
    await denied.run();assert.equal(denied.by("/market_preview_mail_settings").length,0);
    assert.equal(denied.by("/market_claim_deliveries").length,0);
  }
});

test("malformed database values and overrides remain disabled and never disclose addresses or credentials",async()=>{
  for(const options of [
    {previewMail:null}, {previewMail:[previewMail]}, {previewMail:{...previewMail,recipient:recipient+",c@example.test"}},
    {previewMail:{...previewMail,recipient:"OMSG <"+recipient+">"}}, {previewMail:{...previewMail,recipient:phone}},
    {previewMail:{...previewMail,recipient:"bad@-example.test"}}, {previewMail:{...previewMail,recipient:recipient+"\n"}},
    {previewMail:{...previewMail,sender:"OMSG <sender@example.test>"}}, {previewMail:{...previewMail,sender:"x@y.test, b@y.test"}},
    {settings:{EMAIL_FROM:"OMSG <x@y.test>\nBcc: z@y.test"}}, {settings:{EMAIL_FROM:"OMSG <x@y.test>, x@y.test"}},
    {settings:{EMAIL_FROM:""}}, {settings:{MARKET_MAIL_FROM:"bad",EMAIL_FROM:"good@example.test"}},
    {settings:{MARKET_RESEND_API_KEY:""}}, {settings:{RESEND_API_KEY:"test\nkey"}},
  ]) {
    const input={...options,previewMail:"previewMail" in options?options.previewMail:previewMail,settings:{...crmSettings,...options.settings}};
    const d=setup(input);assert.equal((await d.run()).status,204);
    assert.equal(d.by("/market_claim_deliveries").length,0);
    const readiness=await (await setup(input).probe()).json();
    assert.equal(readiness.email_enabled,false);assert.equal(readiness.sms_enabled,false);
    assert.ok(Object.values(readiness).every(v=>typeof v==="boolean"));
  }
  const noKey=setup({settings:{...crmSettings,RESEND_API_KEY:undefined},previewMail});
  assert.deepEqual(await (await noKey.probe()).json(),{email_enabled:false,sms_enabled:false,email_key_present:false,
    email_sender_configured:true,email_recipient_configured:true,preview_settings_lookup_failed:false});
  const down=setup({settings:crmSettings,settingsFail:true});assert.equal((await down.run()).status,503);
  assert.equal(down.by("/market_claim_deliveries").length,0);
  const downProbe=setup({settings:crmSettings,settingsFail:true});
  assert.deepEqual(await (await downProbe.probe()).json(),{email_enabled:false,sms_enabled:false,email_key_present:true,
    email_sender_configured:false,email_recipient_configured:false,preview_settings_lookup_failed:true});
});

test("an explicit preview recipient list always requires explicit preview mode",async()=>{
  const settings={...crmSettings,MARKET_PREVIEW_RECIPIENTS:recipient+","+phone,MARKET_MAIL_FROM:config.MARKET_MAIL_FROM};
  const d=setup({settings,previewMail});
  assert.equal((await d.run()).status,204);
  assert.deepEqual(d.calls.map(c=>c.url.split("/").at(-1)),["market_consume_dispatch_ticket"]);
  assert.ok(!d.envReads.includes("RESEND_API_KEY"));
  assert.deepEqual(await (await setup({settings,previewMail}).probe()).json(),{email_enabled:false,sms_enabled:false});
});

test("production, unpinned projects and explicit invalid modes never read CRM keys or the preview settings",async()=>{
  const prod="b".repeat(20);
  for(const settings of [
    {MARKET_DISPATCH_ENV:""}, {MARKET_DISPATCH_ENV:"development"}, {MARKET_DISPATCH_ENV:"production"},
    {SUPABASE_URL:"https://"+prod+".supabase.co",MARKET_DISPATCH_ENV:"preview"},
    {SUPABASE_URL:"https://"+prod+".supabase.co",MARKET_DISPATCH_ENV:undefined},
    {SUPABASE_URL:"https://"+prod+".supabase.co",MARKET_DISPATCH_ENV:"production",
     MARKET_PRODUCTION_PROJECT_REF:prod,MARKET_SITE_ORIGIN:"https://ottawamultiservicesgroup.com"},
  ]) {
    const d=setup({settings:{...crmSettings,...settings,MARKET_TWILIO_AUTH_TOKEN:undefined},previewMail});
    const res=await d.probe();assert.equal(res.status,200);
    assert.deepEqual(await res.json(),{email_enabled:false,sms_enabled:false});
    assert.equal(d.by("/market_preview_mail_settings").length,0);
    assert.ok(!d.envReads.includes("RESEND_API_KEY"));assert.ok(!d.envReads.includes("EMAIL_FROM"));
  }
});
