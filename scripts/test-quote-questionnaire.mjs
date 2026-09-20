import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import ts from 'typescript';
const options={module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022};
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:options}).outputText).toString('base64')}`;
const sharedUrl=moduleUrl(readFileSync(new URL('../supabase/functions/_shared/quote-questionnaire.ts',import.meta.url),'utf8'));
const {questionnaireSections,renderQuestionnaireHtml}=await import(sharedUrl);
const {initialSelection,calculateCleaningEstimate,pricingAnswers}=await import(moduleUrl(readFileSync(new URL('../src/lib/cleaning-pricing.ts',import.meta.url),'utf8')));
const selection={...initialSelection('residential'),plan:'weekly',profile:'three',addons:{oven:1,fridge:1,baseboards:1,windows:2,linen:2},addonFrequencies:{linen:'every'}};
const makeAnswers=locale=>({...pricingAnswers(selection,calculateCleaningEstimate(selection),locale),preferredLanguage:locale,preferredContactMethod:'Email','Contact consent':'Yes','Quality photos consent':'Yes'});
let passed=0;
function test(name,fn){fn();passed++;console.log(`PASS ${name}`)}

test('New EN/FR summaries replace raw selection JSON and show both visit totals',()=>{
 for(const locale of ['en','fr']){
  const sections=questionnaireSections(makeAnswers(locale)), html=renderQuestionnaireHtml(makeAnswers(locale));
  assert.ok(sections.length>=4);assert.doesNotMatch(html,/Selection JSON|&quot;audience&quot;/);
  assert.match(html,locale==='fr'?/Résumé des choix/:/Selection summary/);
  assert.match(html,locale==='fr'?/Première visite seulement/:/First visit only/);
  assert.match(html,locale==='fr'?/À chaque visite/:/Every visit/);
  assert.match(html,locale==='fr'?/423,75/:/423\.75/);assert.match(html,locale==='fr'?/212,44/:/212\.44/);
 }
});
const legacy={
 'Request source':'cleaning_pricing','Selection JSON':JSON.stringify({...selection,addonFrequencies:undefined}),
 'Pricing version':'2026-09-20-v4','Customer type':'residential',Plan:'Once a week',Condition:'normal',
 'Property profile':'3 bedrooms · 1.5 bathrooms · up to 1,500 sq. ft.','Requested frequency':'Once a week','Estimate province':'Ontario',
 'Selected add-ons':'Inside refrigerator × 1: $30; Inside oven × 1: $40; Change bed linen × 2: $20; Wash baseboards × 1: $70; Interior window glass × 2: $20; Fridge and oven bundle saving × 1: -$5',
 'First visit subtotal CAD':'375','First visit total CAD':'423.75','Recurring visit subtotal CAD':'343','Average recurring month before tax CAD':'1486.33',
};
test('Old requests display readable saved details without recalculating their historic totals',()=>{
 const before=JSON.stringify(legacy), html=renderQuestionnaireHtml(legacy);
 assert.doesNotMatch(html,/Selection JSON|&quot;audience&quot;/);
 assert.match(html,/3 bedrooms/);assert.match(html,/Normal use/);assert.match(html,/343\.00/);assert.match(html,/1,486\.33/);
 assert.match(html,/earlier estimate included the selected extras at every recurring visit/);
 assert.equal(JSON.stringify(legacy),before);
});
test('Missing or malformed legacy JSON does not break a notification',()=>{
 assert.doesNotThrow(()=>renderQuestionnaireHtml({...legacy,'Selection JSON':'{broken'}));
 assert.match(renderQuestionnaireHtml({...legacy,'Selection JSON':'{broken'}),/3 bedrooms/);
 assert.equal(renderQuestionnaireHtml(null),'');
});
test('Unpriced custom schedules never become a zero-dollar quote in the readable summary',()=>{
 const s={...selection,plan:'flexible',customFrequency:'Three mornings every 10 days',visitsPerWeek:0};
 const html=renderQuestionnaireHtml(pricingAnswers(s,calculateCleaningEstimate(s),'en'));
 assert.match(html,/Three mornings every 10 days/);assert.match(html,/Every visit/);assert.doesNotMatch(html,/\$0\.00|First visit · provisional estimate/);
});
test('Customer-provided content is HTML-escaped, with line breaks preserved',()=>{
 const html=renderQuestionnaireHtml({...makeAnswers('en'),'Business name':'<img src=x onerror=alert(1)>','Selection summary':'<script>alert(1)</script>\nNext line'});
 assert.doesNotMatch(html,/<script|<img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/<br>Next line/);
});
test('Other service questionnaires remain readable and retain their fields',()=>{
 const html=renderQuestionnaireHtml({moving_size:'Two bedrooms',stairs:true,items:['Desk','Bed'],measurements:{height:100,width:80}});
 assert.match(html,/Two bedrooms/);assert.match(html,/Stairs/);assert.match(html,/Yes/);assert.match(html,/Desk; Bed/);assert.match(html,/Height: 100/);
});

// Exercise the actual Edge Function handler with local doubles only: no network or real email.
let handler, currentAnswers=makeAnswers('en'), duplicate=false;
const sent=[],logged=[];
const fixture=()=>({id:'11111111-1111-4111-8111-111111111111',first_name:'Example',last_name:'Client',email:'client@example.test',phone:'6135550100',address_line:'100 Example Street',service_name:'House Cleaning',description:null,questionnaire_answers:currentAnswers,created_at:new Date().toISOString()});
const originalFetch=globalThis.fetch, originalDeno=globalThis.Deno;
globalThis.__quoteEmailTest={createClient:()=>({from(table){return {select(){return this},eq(){return this},async maybeSingle(){return {data:table==='service_requests'?fixture():table==='email_notifications'&&duplicate?{id:'already-sent'}:null,error:null}},async insert(value){logged.push(value);return {error:null}}}},auth:{getUser:async()=>({data:{user:null}})}})};
globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://qa.invalid',SUPABASE_ANON_KEY:'qa-only',SUPABASE_SERVICE_ROLE_KEY:'qa-only',RESEND_API_KEY:'qa-only',ADMIN_NOTIFICATION_EMAIL:'admin@example.test',EMAIL_FROM:'qa@example.test',SITE_URL:'https://example.test'})[key]},serve:fn=>{handler=fn}};
globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(init.body));return new Response(JSON.stringify({id:'mock-email-'+sent.length}),{status:200})};
try{
 let edge=readFileSync(new URL('../supabase/functions/send-crm-email/index.ts',import.meta.url),'utf8');
 edge=edge.replace(/import \{ createClient \} from "https:[^\n]+\n/,'const createClient = globalThis.__quoteEmailTest.createClient;\n');
 edge=edge.replace('"../_shared/quote-questionnaire.ts"',JSON.stringify(sharedUrl));
 await import(moduleUrl(edge));
 for(const locale of ['en','fr']){
  currentAnswers=makeAnswers(locale);
  const response=await handler(new Request('https://qa.invalid/functions/v1/send-crm-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'quote_requested',requestId:fixture().id})}));
  assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
  const email=sent.at(-1);assert.deepEqual(email.to,['admin@example.test']);assert.equal(email.reply_to,'client@example.test');
  assert.match(email.html,locale==='fr'?/Résumé des choix/:/Selection summary/);assert.doesNotMatch(email.html,/Selection JSON/);
  assert.match(email.subject,locale==='fr'?/Nouvelle demande de devis/:/New quote request/);
  if(process.env.CLEANING_PREVIEW_DIR){mkdirSync(process.env.CLEANING_PREVIEW_DIR,{recursive:true});writeFileSync(`${process.env.CLEANING_PREVIEW_DIR}/quote-email-${locale}.html`,email.html);writeFileSync(`${process.env.CLEANING_PREVIEW_DIR}/answers-${locale}.json`,JSON.stringify(currentAnswers,null,2));}
 }
 passed++;console.log('PASS actual notification handler renders EN/FR summaries and keeps its admin recipient');
 duplicate=true;
 const before=sent.length;
 const response=await handler(new Request('https://qa.invalid/functions/v1/send-crm-email',{method:'POST',body:JSON.stringify({type:'quote_requested',requestId:fixture().id})}));
 assert.equal((await response.json()).duplicate,true);assert.equal(sent.length,before);assert.equal(logged.length,2);
 passed++;console.log('PASS notification idempotency prevents a duplicate email');
}finally{globalThis.fetch=originalFetch;globalThis.Deno=originalDeno;delete globalThis.__quoteEmailTest;}
console.log(`${passed} questionnaire and notification checks passed. No real email sent.`);
