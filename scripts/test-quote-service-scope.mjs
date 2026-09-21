import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import ts from 'typescript';
const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
const url = source => 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const pricingUrl=url(read('../src/lib/cleaning-pricing.ts'));
const questionnaireUrl=url(read('../supabase/functions/_shared/quote-questionnaire.ts'));
const {initialSelection,calculateCleaningEstimate,pricingAnswers,proposedScopeFromAnswers,ADDONS,PLANS}=await import(pricingUrl);
const {buildEstimateDraft,quoteTotals}=await import(url(read('../src/lib/estimate-request.ts').replace('./cleaning-pricing',pricingUrl).replace('../../supabase/functions/_shared/quote-questionnaire',questionnaireUrl)));
const {attachServiceScope,readServiceScope,termsWithoutScope,renderServiceScopeHtml,validServiceScope,readableQuoteTerms}=await import(url(read('../supabase/functions/_shared/quote-service-scope.ts')));
const base={id:'33333333-3333-4333-8333-333333333333',customer_id:'44444444-4444-4444-8444-444444444444',request_number:7010,first_name:'Example',last_name:'Client',email:'client@example.test',address_line:'100 Example Street',city:'Ottawa',province:'Ontario',postal_code:'K1A 0B1',service_name:'House Cleaning'};
const selection={...initialSelection('residential'),plan:'weekly',profile:'two',addons:{fridge:1,oven:1,cabinets:1,linen:2,garage:1,balcony:1},addonFrequencies:{linen:'every'}};
const request=(s=selection,locale='en')=>({...base,province:s.province,questionnaire_answers:{...pricingAnswers(s,calculateCleaningEstimate(s),locale),preferredLanguage:locale}});
const official=(s=selection,locale='en',basis='first')=>{const draft=buildEstimateDraft(request(s,locale),basis);return {draft,scope:readServiceScope(attachServiceScope(draft.billingCondition,draft.serviceScope,draft.locale))};};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('The new request saves a readable task snapshot in both languages',()=>{
 const r=request();for(const locale of ['en','fr']) {const proposed=proposedScopeFromAnswers(r.questionnaire_answers,locale);assert.equal(proposed.source,'saved');assert.ok(validServiceScope(proposed.body));assert.doesNotMatch(proposed.body,/"addons"|Selection JSON/);}
});
test('First-only extras disappear after visit 1; selected recurring extras appear in all five rows',()=>{
 const {scope}=official();assert.equal(scope.sections.filter(s=>s.id.startsWith('visit-')).length,5);
 for(const visit of [1,2,3,4,5]) {const body=scope.sections.find(s=>s.id===`visit-${visit}`).lines.join('\n');assert.match(body,/Change bed linen × 2/);if(visit===1){assert.match(body,/Inside refrigerator × 1/);assert.match(body,/up to 20 door or drawer openings/);assert.match(body,/300 sq\. ft\./);assert.match(body,/100 sq\. ft\./);}else assert.doesNotMatch(body,/refrigerator|Inside oven|kitchen cabinets|garage|balcony/i);}
});
test('Each visit references a saved routine checklist; credit does not remove tasks',()=>{
 const {scope}=official();const common=scope.sections.find(s=>s.title==='Included cleaning');assert.ok(common.lines.length>=6);assert.match(common.lines.join('\n'),/Toilets|Vacuum|microwave/);
 assert.match(scope.sections.find(s=>s.id==='visit-4').lines.join('\n'),/price only/);
});
test('Residential and commercial EN/FR quotes preserve address, limits, products and quality follow-up',()=>{
 for(const audience of ['residential','commercial'])for(const locale of ['en','fr']){const {scope}=official({...initialSelection(audience),addons:{linen:2},addonFrequencies:{linen:'every'}},locale);const text=scope.body;assert.match(text,/100 Example Street/);assert.match(text,locale==='fr'?/Produits et préparation/:/Products and preparation/);assert.match(text,locale==='fr'?/visite gratuite sur site/:/free on-site assessment/);assert.match(text,/checklist/);assert.match(text,locale==='fr'?/autorisation préalable/:/prior client authorization/);if(audience==='commercial')assert.match(text,locale==='fr'?/distributeurs accessibles/:/accessible dispensers/);}
});
test('Deep cleaning includes detailed tasks exactly once; add-on-only work excludes general cleaning',()=>{
 const deep=official({...selection,plan:'deep',addons:{baseboards:1,doors:2}}).scope;assert.equal(deep.sections.filter(s=>s.id.startsWith('visit-')).length,1);assert.match(deep.body,/Wash accessible baseboards/);assert.doesNotMatch(deep.sections.find(s=>s.id==='visit-1').lines.join('\n'),/baseboards ×|doors ×/i);
 const extras=official({...selection,plan:'extras'}).scope;assert.match(extras.body,/No general cleaning is included/);assert.doesNotMatch(extras.body,/Dust and wipe accessible furniture/);
});
test('Stored snapshots survive later catalogue edits and are independent of selected invoice phase',()=>{
 const r=request(),snapshot=r.questionnaire_answers['Service scope EN'];const addon=ADDONS.find(a=>a.id==='fridge'),before=addon.scope.en;addon.scope.en='CHANGED AFTER THE REQUEST';try{assert.equal(proposedScopeFromAnswers(r.questionnaire_answers,'en').body,snapshot);for(const basis of ['first','qualifying','fourth','recurring'])assert.doesNotMatch(buildEstimateDraft(r,basis).serviceScope,/CHANGED AFTER/);}finally{addon.scope.en=before;}
});
test('Older requests can propose a reviewed annex only for a new draft; prices are not recalculated',()=>{
 const r=request();delete r.questionnaire_answers['Service scope EN'];delete r.questionnaire_answers['Service scope FR'];const before=JSON.stringify(r),d=buildEstimateDraft(r);assert.equal(d.serviceScopeSource,'proposed');assert.match(d.serviceScope,/Inside refrigerator/);assert.equal(quoteTotals(d.lines,d.taxRate,d.discount).total,calculateCleaningEstimate(selection).total);assert.equal(JSON.stringify(r),before);
 assert.equal(readServiceScope('Previously accepted conditions'),null);
});
test('Specialist work, heavy conditions and unknown legacy selections require a manually defined scope',()=>{
 for(const patch of [{plan:'specialist'},{condition:'heavy'},{profile:'custom'},{audience:'commercial',businessType:'specialist'}])assert.equal(buildEstimateDraft(request({...selection,...patch})).serviceScope,'');
 const r=request();delete r.questionnaire_answers['Service scope EN'];r.questionnaire_answers['Add-on schedule']='Unknown old option';assert.equal(buildEstimateDraft(r).serviceScope,'');
});
test('Annex replacement preserves other conditions, is idempotent, and never mutates the old quote',()=>{
 const {draft}=official();const original='Payment terms already agreed.';const first=attachServiceScope(original,draft.serviceScope,'en');const again=attachServiceScope(first,draft.serviceScope,'en');assert.equal(first,again);assert.equal(termsWithoutScope(first),original);assert.equal(readServiceScope(first).body,draft.serviceScope);assert.equal(original,'Payment terms already agreed.');
});
test('Invalid/duplicate annexes remain visible as raw terms and are not silently accepted as structured scope',()=>{
 const {draft}=official();const valid=attachServiceScope('Existing terms',draft.serviceScope,'en');for(const text of [valid+'\n'+valid,valid.replace('=== END OMSG SERVICE SCOPE ===',''),valid.replace('(en)','(xx)')]){assert.equal(readServiceScope(text),null);assert.equal(termsWithoutScope(text),text);}assert.equal(validServiceScope('Unstructured'),false);assert.throws(()=>attachServiceScope('',draft.serviceScope+'\n=== END OMSG SERVICE SCOPE ===','en'));
});
test('Customer email includes the saved tasks and escapes HTML without exposing unrelated notes',()=>{
 const {draft}=official();const terms=attachServiceScope('Private-looking string outside the annex',draft.serviceScope+'\n\n## Special instructions\n- <img src=x onerror=alert(1)>','en');const html=renderServiceScopeHtml(terms,'en');assert.match(html,/Inside refrigerator|Included cleaning|Visit 4|Limits and excluded work/);assert.doesNotMatch(html,/<img|Private-looking|=== OMSG/);assert.match(html,/&lt;img/);
});
test('Inherited invoice terms and PDF text retain the complete scope without technical delimiters',()=>{
 const {draft}=official();const terms=attachServiceScope('Payment terms',draft.serviceScope,'en');const readable=readableQuoteTerms(terms);assert.match(readable,/Payment terms|ANNEX — SERVICES BY VISIT|Visit 4|Inside refrigerator/);assert.doesNotMatch(readable,/=== OMSG|=== END|## /);assert.equal(readableQuoteTerms('Legacy terms'),'Legacy terms');
});
console.log(`${passed} service-scope checks passed. No database writes or real email.`);
if(process.env.SCOPE_PREVIEW_DIR){mkdirSync(process.env.SCOPE_PREVIEW_DIR,{recursive:true});writeFileSync(process.env.SCOPE_PREVIEW_DIR+'/scope-fixtures.json',JSON.stringify({request:request(),french:request(selection,'fr'),commercial:request({...initialSelection('commercial'),addons:{linen:2},addonFrequencies:{linen:'every'}},'fr'),specialist:request({...selection,plan:'specialist'})},null,2));}
