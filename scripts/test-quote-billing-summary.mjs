import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import ts from 'typescript';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const questionnaireUrl=moduleUrl(read('../supabase/functions/_shared/quote-questionnaire.ts'));
const scopeUrl=moduleUrl(read('../supabase/functions/_shared/quote-service-scope.ts'));
const {attachServiceScope}=await import(scopeUrl);
const pricingUrl=moduleUrl(read('../src/lib/cleaning-pricing.ts'));
const billingUrl=moduleUrl(read('../supabase/functions/_shared/quote-billing-summary.ts'));
const {readBillingSchedule:summary,renderBillingSummaryHtml:html,billingRows}=await import(billingUrl);
const {buildEstimateDraft,quoteTotals}=await import(moduleUrl(read('../src/lib/estimate-request.ts').replace('../../supabase/functions/_shared/quote-questionnaire',questionnaireUrl).replace('./cleaning-pricing',pricingUrl)));
const {initialSelection,calculateCleaningEstimate:estimate,pricingAnswers,HOME_PROFILES,BUSINESS_PROFILES}=await import(moduleUrl(read('../src/lib/cleaning-pricing.ts')));
const selection={...initialSelection('residential'),plan:'weekly',profile:'two'};
const request=(s=selection,locale='en')=>({id:'33333333-3333-4333-8333-333333333333',customer_id:'44444444-4444-4444-8444-444444444444',request_number:7002,service_name:'House Cleaning',questionnaire_answers:{...pricingAnswers(s,estimate(s),locale),preferredLanguage:locale}});
function saved(s=selection,locale='en',basis='first') {
 const d=buildEstimateDraft(request(s,locale),basis),totals=quoteTotals(d.lines,d.taxRate,d.discount);
 return {id:'55555555-5555-4555-8555-555555555555',estimate_number:'Q-TEST-7002',title:d.title,notes:d.notes,terms:attachServiceScope(d.billingCondition,d.serviceScope,d.locale),currency:'CAD',subtotal:totals.subtotal,discount_total:d.discount,tax_rate:d.taxRate,tax_total:totals.tax,total:totals.total,items:d.lines.map((row,index)=>({...row,id:'item-'+index,line_total:row.quantity*row.unit_price})),status:'sent',updated_at:'2026-09-20T12:00:00Z',created_at:'2026-09-20T12:00:00Z',estimated_duration_minutes:210,crew_size:1,customer_id:request().customer_id,service_request_id:request().id,valid_until:'2026-10-20'};
}
let passed=0;
function test(name,run){run();passed++;console.log('PASS '+name);}
test('Five visit rows show the saved three-and-a-half-hour plan and the fourth credit',()=>{
 const q=saved(),s=summary(q);assert.ok(s);assert.equal(s.credit,84);assert.equal(s.first.total,197.75);assert.equal(s.qualifying.total,197.75);assert.equal(s.fourth.total,71.19);assert.equal(s.recurring.total,166.11);
 assert.deepEqual(billingRows(s,'en').map(r=>r.value.total),[197.75,197.75,197.75,71.19,166.11]);
 assert.equal(s.fourth.beforeTax,63);assert.equal(s.fourth.tax,8.19);assert.match(html(q,'en'),/Credit on invoice 4/);
});
test('Every supported recurring profile, province, language and quote phase preserves exact amounts',()=>{
 let count=0;
 for(const audience of ['residential','commercial']) for(const province of ['Ontario','Quebec']) for(const locale of ['en','fr']) for(const profile of (audience==='residential'?HOME_PROFILES:BUSINESS_PROFILES)) for(const plan of (audience==='residential'?['weekly','biweekly','monthly']:['recurring'])) {
  const s={...initialSelection(audience),plan,province,profile:profile.id,addons:{fridge:1,oven:1,linen:2},addonFrequencies:{linen:'every'}},e=estimate(s);if(e.requiresQuote)continue;
  for(const basis of ['first','qualifying','fourth','recurring']) {
   const q=saved(s,locale,basis),view=summary(q);assert.ok(view,`${audience}/${province}/${locale}/${profile.id}/${plan}/${basis}`);assert.equal(view.active,basis);
   assert.equal(view.first.total,e.total);assert.equal(view.qualifying.total,e.qualifyingTotal);assert.equal(view.fourth.total,e.fourthTotal);assert.equal(view.recurring.total,e.subsequentTotal);assert.equal(view.credit,e.fourthCredit);count++;
  }
 }
 assert.ok(count>300);console.log(`  ${count} stored schedules verified`);
});
test('One-off extras do not enter the credit or later invoices',()=>{
 const q=saved({...selection,addons:{fridge:1,oven:1}}),s=summary(q);
 assert.equal(s.first.total,271.2);assert.equal(s.qualifying.total,197.75);assert.equal(s.credit,84);assert.equal(s.fourth.total,71.19);
});
test('Edited official prices, taxes, currency or discounts never display an obsolete schedule',()=>{
 const q=saved();for(const patch of [{total:999},{subtotal:176},{tax_total:23},{discount_total:1},{tax_rate:.14975},{currency:'USD'},{title:'Custom amended quote'}])assert.equal(summary({...q,...patch}),null);
});
test('Historical, one-time and unpriced quotes do not acquire a fabricated fourth-visit credit',()=>{
 assert.equal(summary({...saved(),notes:'Original provisional subtotal per following visit: $147.00',terms:'This quote is valid for 30 days.',title:'Once a week — Following visit'}),null);
 assert.equal(summary(saved({...selection,plan:'once'})),null);assert.equal(summary(saved({...selection,plan:'flexible'})),null);
});
test('Incomplete, duplicated or inconsistent saved schedules are rejected',()=>{
 const q=saved();for(const notes of [q.notes.replace('Visit 4 after credit: $71.19','Visit 4 after credit: $1'),q.notes.replace('Accumulated credit before tax: $84','Accumulated credit before tax: $85'),q.notes.replace('Visit 1, full rate: $197.75','Visit 1, full rate: -$197.75'),q.notes+'\n'+q.notes])assert.equal(summary({...q,notes}),null);
 assert.equal(summary({...q,total:NaN}),null);assert.equal(summary({...q,tax_total:''}),null);
});
test('Summary presentation is bilingual, contains no customer notes, and never mutates the quote',()=>{
 const q=saved(),before=JSON.stringify(q);for(const locale of ['en','fr']) {
  const rendered=html({...q,notes:q.notes+'\n<img src=x onerror=alert(1)>'},locale);
  assert.doesNotMatch(rendered,/<img|onerror|Selection JSON/);assert.match(rendered,locale==='fr'?/71,19/:/71\.19/);assert.match(rendered,locale==='fr'?/Visite 5 et suivantes/:/Visit 5 onward/);
 }
 assert.equal(JSON.stringify(q),before);
});
// Exercise the real official-quote email handler with local doubles only.
let handler,fixture=saved(),duplicate=false,allowed=true;
const sent=[],logs=[],links=[];
const adminUser={id:'22222222-2222-4222-8222-222222222222',email:'admin@example.test'};
const customer=locale=>({id:request().customer_id,first_name:'Example',last_name:'Client',email:'client@example.test',preferred_language:locale});
const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
globalThis.__billingEmailTest = {
 createClient: () => ({
  from(table) {
   return {
    select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: table === 'admin_users' ? (allowed ? adminUser : null) : table === 'estimates' ? fixture : table === 'customers' ? fixture.customer : table === 'email_notifications' && duplicate ? {id:'existing'} : null, error:null }; },
    async insert(value) { logs.push(value); return {error:null}; }
   };
  },
  auth: {
   getUser: async () => ({data:{user:adminUser}}),
   admin: {
    generateLink: async value => { links.push(value); return {data:{properties:{action_link:'https://example.test/secure-quote?token=test-only&quote=7002'}},error:null}; }
   }
  }
 })
};
globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://qa.invalid',SUPABASE_ANON_KEY:'qa-only',SUPABASE_SERVICE_ROLE_KEY:'qa-only',RESEND_API_KEY:'qa-only',ADMIN_NOTIFICATION_EMAIL:'admin@example.test',EMAIL_FROM:'qa@example.test',SITE_URL:'https://example.test'})[key]},serve:fn=>{handler=fn}};
globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(init.body));return new Response(JSON.stringify({id:'mock-'+sent.length}),{status:200})};
const send=()=>handler(new Request('https://qa.invalid/functions/v1/send-crm-email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-only'},body:JSON.stringify({type:'estimate_ready',estimateId:fixture.id})}));
try{
 let edge=read('../supabase/functions/send-crm-email/index.ts').replace(/import \{ createClient \} from "https:[^\n]+\n/,'const createClient = globalThis.__billingEmailTest.createClient;\n').replace('"../_shared/quote-questionnaire.ts"',JSON.stringify(questionnaireUrl)).replace('"../_shared/quote-billing-summary.ts"',JSON.stringify(billingUrl)).replace('"../_shared/quote-service-scope.ts"',JSON.stringify(scopeUrl));
 await import(moduleUrl(edge));
 for(const locale of ['en','fr']) {
  fixture={...saved(selection,locale),customer:customer(locale)};const response=await send();assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
  const email=sent.at(-1);assert.deepEqual(email.to,['client@example.test']);assert.match(email.html,locale==='fr'?/71,19/:/71\.19/);assert.match(email.html,locale==='fr'?/Voir mon devis, les prestations et les calculs/:/View my quote, services and calculations/);assert.match(email.html,/secure-quote\?token=test-only&amp;quote=7002/);
  assert.match(links.at(-1).options.redirectTo,/\/portal\?estimate=55555555/);
  if(process.env.BILLING_PREVIEW_DIR){mkdirSync(process.env.BILLING_PREVIEW_DIR,{recursive:true});writeFileSync(`${process.env.BILLING_PREVIEW_DIR}/official-email-v10-${locale}.html`,email.html);}
 }
 passed++;console.log('PASS real estimate-ready handler sends EN/FR schedule to the intended customer with secure portal link');
 duplicate=true;const before=sent.length;assert.equal((await (await send()).json()).duplicate,true);assert.equal(sent.length,before);assert.equal(logs.length,2);
 passed++;console.log('PASS official email idempotency remains unchanged');
 allowed=false;duplicate=false;const originalError=console.error;console.error=()=>{};
 try{assert.equal((await send()).status,400);assert.equal(sent.length,before);}finally{console.error=originalError;}
 passed++;console.log('PASS official email still requires an active administrator');
}finally{globalThis.fetch=originalFetch;globalThis.Deno=originalDeno;delete globalThis.__billingEmailTest;}
console.log(`${passed} client billing-summary checks passed. No real email sent.`);
if(process.env.BILLING_PREVIEW_DIR)writeFileSync(`${process.env.BILLING_PREVIEW_DIR}/fixtures.json`,JSON.stringify({en:saved(),fr:saved(selection,'fr'),quebec:saved({...selection,province:'Quebec'},'fr'),fourth:saved(selection,'en','fourth'),legacy:{...saved(),title:'Once a week — Following visit',notes:'Original provisional subtotal per following visit: $147.00',terms:'This quote is valid for 30 days.'}},null,2));
