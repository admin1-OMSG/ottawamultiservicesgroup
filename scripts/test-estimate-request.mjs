import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const dataModule = (path, replacements = []) => {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const [from,to] of replacements) source=source.replace(from,to);
  return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
};
const questionnaire=dataModule('../supabase/functions/_shared/quote-questionnaire.ts');
const {buildEstimateDraft: draft, quoteTotals, quoteTaxRows,requestHasRecurringPrice}=await import(dataModule('../src/lib/estimate-request.ts', [['../../supabase/functions/_shared/quote-questionnaire',questionnaire]]));
const {initialSelection,calculateCleaningEstimate: estimate,pricingAnswers,HOME_PROFILES,BUSINESS_PROFILES,ADDONS}=await import(dataModule('../src/lib/cleaning-pricing.ts'));
const base={id:'33333333-3333-4333-8333-333333333333',request_number:7001,customer_id:'44444444-4444-4444-8444-444444444444',first_name:'Example',last_name:'Client',email:'client@example.test',phone:'6135550100',address_line:'100 Example Street',city:'Ottawa',province:'Ontario',postal_code:'K1A 0B1',service_name:'House Cleaning',preferred_date:'2026-10-01',description:'Please use the side entrance.',internal_notes:'PRIVATE ADMIN NOTE'};
const example={...initialSelection('residential'),plan:'weekly',profile:'three',addons:{oven:1,fridge:1,baseboards:1,windows:2,linen:2},addonFrequencies:{linen:'every'}};
function request(selection=example,locale='en') {return {...base,province:selection.province,questionnaire_answers:{...pricingAnswers(selection,estimate(selection),locale),preferredLanguage:locale}};}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('First visit imports saved lines, contact, address, schedule, notes and exact totals',()=>{
 const d=draft(request());assert.equal(d.imported,true);assert.equal(d.lines.length,5);assert.equal(d.lines[0].quantity,4);assert.equal(d.lines[0].unit_price,50);assert.equal(d.hours,4);
 assert.equal(d.serviceType,'one_time');assert.equal(d.frequency,'weekly');assert.deepEqual(d.warnings,[]);
 assert.equal(quoteTotals(d.lines,d.taxRate).total,423.75);
 assert.match(d.notes,/100 Example Street/);assert.match(d.notes,/2026-10-01/);assert.match(d.notes,/side entrance/);assert.match(d.notes,/Every visit/);
 assert.doesNotMatch(d.notes,/PRIVATE ADMIN NOTE|Selection JSON|"audience"/);
});
test('Following visit has recurring linen only and never charges first-only extras twice',()=>{
 const d=draft(request(),'recurring');assert.equal(d.lines.length,2);assert.equal(d.lines[0].unit_price,42);assert.equal(d.serviceType,'recurring');
 assert.equal(quoteTotals(d.lines,d.taxRate).total,212.44);assert.doesNotMatch(JSON.stringify(d.lines),/refrigerator|oven|baseboards|windows/);
 assert.match(d.title,/Following visit/);assert.match(d.notes,/provisional references/);
});
test('Appliance bundle remains one net $65 line, with no negative database prices',()=>{
 const d=draft(request());const pair=d.lines.find(row=>row.description.includes('bundle saving'));
 assert.equal(pair.unit_price,65);assert.equal(pair.quantity,1);assert.match(pair.description,/5\.00 CAD/);assert.ok(d.lines.every(row=>row.unit_price>=0));
 const s={...example,addons:{oven:1,fridge:1},addonFrequencies:{oven:'every'}};
 const following=draft(request(s),'recurring');assert.equal(following.lines[1].unit_price,40);assert.equal(following.lines.length,2);
});
test('French numbers and Quebec taxes preserve individually rounded stored totals',()=>{
 const s={...initialSelection('commercial'),province:'Quebec',addons:{cabinets:1,linen:2},addonFrequencies:{linen:'every'}};
 const first=draft(request(s,'fr')),following=draft(request(s,'fr'),'recurring');
 assert.equal(first.taxRate,.14975);assert.equal(quoteTotals(first.lines,first.taxRate).total,143.72);assert.equal(quoteTotals(following.lines,following.taxRate).total,126.47);
 assert.match(first.title,/Première visite/);assert.equal(following.frequency,'weekly');assert.equal(first.lines[2].quantity,2);
 assert.deepEqual(quoteTaxRows(125,.14975).map(row=>row.amount),[6.25,12.47]);
});
test('Supported plan/add-on combinations retain the calculator totals in both languages',()=>{
 let combinations=0;
 // Cover standard, deep, recurring and add-on-only with every currently offered extra.
 for(const audience of ['residential','commercial']) for(const province of ['Ontario','Quebec']) for(const locale of ['en','fr']) {
  for(const plan of (audience==='residential'?['once','deep','extras','weekly','biweekly','monthly']:['once','deep','extras','recurring'])) {
   for(const addon of [{id:'none'},...ADDONS]) {
    const s={...initialSelection(audience),province,plan,addons:addon.id==='none'?{}:{[addon.id]:2},addonFrequencies:{[addon.id]:'every'}};
    const e=estimate(s);if(e.requiresQuote)continue;
    const r=request(s,locale);const d=draft(r);
    assert.equal(d.imported,true,`${audience}/${province}/${locale}/${plan}/${addon.id}`);
    assert.equal(quoteTotals(d.lines,d.taxRate).total,e.total);
    if(e.recurring)assert.equal(quoteTotals(draft(r,'recurring').lines,d.taxRate).total,e.subsequentTotal);
    combinations++;
   }
  }
 }
 assert.ok(combinations>1000);console.log(`  ${combinations} combinations checked`);
});
test('Every property profile retains base hours and exact totals, including large French amounts',()=>{
 for(const audience of ['residential','commercial'])for(const profile of (audience==='residential'?HOME_PROFILES:BUSINESS_PROFILES))for(const locale of ['en','fr']) {
  const s={...initialSelection(audience),plan:'deep',profile:profile.id,province:'Quebec',addons:{windows:20,walls:10}};
  const e=estimate(s);if(e.requiresQuote)continue;
  const d=draft(request(s,locale));assert.equal(d.imported,true);assert.equal(d.lines[0].quantity,e.hours);assert.equal(quoteTotals(d.lines,d.taxRate).total,e.total);
 }
});
test('Historical requests use stored amounts even when current unit rates differ',()=>{
 const r=request();r.questionnaire_answers={ 'Request source':'cleaning_pricing','Pricing version':'old','Selection JSON':'{"plan":"weekly"}','Customer type':'residential',Plan:'Once a week','Property profile':'3 bedrooms','Requested frequency':'Once a week','Estimate province':'Ontario','Estimated base worker-hours':'4','Base rate CAD per worker-hour':'42','Selected add-ons':'Inside kitchen cabinets × 1: $45.00; Inside refrigerator × 1: $30.00; Inside oven × 1: $40.00; Fridge and oven bundle saving × 1: -$5.00','First visit subtotal CAD':'310','First visit total CAD':'350.3','Recurring visit subtotal CAD':'278'};
 const d=draft(r),f=draft(r,'recurring');assert.equal(d.lines.find(row=>/cabinets/.test(row.description)).unit_price,45);
 assert.equal(d.lines[0].unit_price,50);assert.equal(quoteTotals(d.lines,d.taxRate).total,350.3);assert.equal(quoteTotals(f.lines,f.taxRate).subtotal,278);
 assert.match(d.notes,/earlier estimate included/);assert.doesNotMatch(d.notes,/Selection JSON/);
});
test('Unpriced specialist and custom-frequency requests retain choices and require manual prices',()=>{
 for(const patch of [{condition:'heavy'},{plan:'flexible',visitsPerWeek:3},{plan:'specialist'},{profile:'custom'}]) {
  const r=request({...example,...patch});const d=draft(r);assert.equal(d.imported,false);assert.equal(d.lines[0].unit_price,null);assert.equal(d.hours,null);assert.match(d.notes,/refrigerator/);assert.ok(d.warnings.length);
 }
});
test('Malformed detail retains the recorded package, never silently reprices from current catalogue',()=>{
 const r=request();r.questionnaire_answers['First visit add-ons']='Unrecognized old details';const d=draft(r);assert.equal(quoteTotals(d.lines,d.taxRate).total,423.75);assert.ok(d.warnings.length);
 const old={...r,questionnaire_answers:{...r.questionnaire_answers,'First visit add-ons subtotal CAD':undefined}};
 const fallback=draft(old);assert.equal(fallback.lines.length,1);assert.equal(fallback.lines[0].unit_price,375);
});
test('Missing/invalid amounts and mismatched taxes are not treated as validated imports',()=>{
 for(const value of ['',null,'NaN','Infinity','-100']) {const r=request();r.questionnaire_answers['First visit subtotal CAD']=value;const d=draft(r);assert.equal(d.imported,false);assert.equal(d.lines[0].unit_price,null);}
 const r=request();r.questionnaire_answers['First visit total CAD']='999';assert.equal(draft(r).imported,false);assert.ok(draft(r).warnings.length);
});
test('One-time services and additional-services minimum stay one-time',()=>{
 const d=draft(request({...example,plan:'once'}),'recurring');assert.equal(d.serviceType,'one_time');assert.equal(d.recurring,false);
 const s={...initialSelection('residential'),plan:'extras',addons:{fridge:1,oven:1}};const extra=draft(request(s));assert.equal(quoteTotals(extra.lines,extra.taxRate).total,169.5);assert.ok(extra.lines.some(row=>/minimum/.test(row.description)));
});
test('Non-cleaning requests keep readable questionnaire and customer notes without inventing prices',()=>{
 const r={...base,service_name:'Moving',questionnaire_answers:{propertyType:'Townhouse',stairs:2,preferredLanguage:'fr'}};
 const d=draft(r);assert.equal(d.lines[0].unit_price,null);assert.match(d.title,/Moving/);assert.match(d.notes,/Townhouse/);assert.match(d.notes,/side entrance/);assert.equal(requestHasRecurringPrice(r),false);
});
test('Changing the official price recomputes tax from edited lines without changing original request',()=>{
 const r=request(),original=JSON.stringify(r),d=draft(r);d.lines[0].unit_price=55;
 assert.equal(quoteTotals(d.lines,d.taxRate).subtotal,395);assert.equal(quoteTotals(d.lines,d.taxRate).total,446.35);assert.equal(JSON.stringify(r),original);
});
console.log(`${passed} request-to-quote checks passed.`);
if(process.env.ESTIMATE_FIXTURE_PATH)writeFileSync(process.env.ESTIMATE_FIXTURE_PATH,JSON.stringify({request:request(),french:request({...example,province:'Quebec'},'fr'),custom:request({...example,plan:'flexible',visitsPerWeek:3}),generic:{...base,service_name:'Moving',questionnaire_answers:{stairs:2}},draft:draft(request()),following:draft(request(),'recurring')},null,2));
