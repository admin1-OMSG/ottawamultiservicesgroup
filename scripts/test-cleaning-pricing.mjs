import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the production calculation module, with the existing TypeScript dependency.
const source = readFileSync(new URL('../src/lib/cleaning-pricing.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { calculateCleaningEstimate: estimate, initialSelection, pricingAnswers, PLANS, packageExample } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const res = (patch={}) => estimate({ ...initialSelection('residential'), ...patch });
const com = (patch={}) => estimate({ ...initialSelection('commercial'), ...patch });
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }

test('Recurring home: initial standard rate, recurring rate and HST', () => {
  const e=res();
  assert.equal(e.firstSubtotal,150); assert.equal(e.total,169.5);
  assert.equal(e.subtotal,135); assert.equal(e.subsequentTotal,152.55);
  assert.equal(e.monthly,292.5);
});
test('Weekly visits cost less than visits every 14 days; annualized budgets match', () => {
  assert.equal(res({plan:'weekly'}).monthly,546);
  assert.equal(res({plan:'biweekly'}).monthly,292.5);
  assert.equal(res({plan:'weekly'}).subtotal,126);
  assert.ok(res({plan:'weekly'}).subtotal < res({plan:'biweekly'}).subtotal);
  assert.equal(res({plan:'weekly'}).subsequentTotal,142.38);
  const selection={...initialSelection('residential'),plan:'weekly'};
  const answers=pricingAnswers(selection,estimate(selection),'fr');
  assert.equal(answers['Recurring visit subtotal CAD'],'126');
  assert.equal(answers['Recurring package saving before tax CAD'],'24');
  assert.equal(res({plan:'monthly'}).monthly,144);
});
test('Dollar savings compare equal packages and respect the one-time minimum', () => {
  const example = id => packageExample(PLANS.find(p => p.id === id));
  assert.deepEqual(example('weekly'),{hours:3,amount:126,saving:24,reference:150,minimum:126});
  assert.deepEqual(example('monthly'),{hours:3,amount:144,saving:6,reference:150,minimum:144});
  assert.deepEqual(example('recurring'),{hours:3,amount:135,saving:15,reference:150,minimum:90});
  assert.equal(com().packageSaving,0); // No fictional two-hour one-time package.
  assert.equal(com({profile:'medium'}).packageSaving,17.5);
  assert.equal(res({plan:'monthly'}).packageSaving,6);
  assert.equal(example('flexible'),null);
});
test('Fridge and oven: exactly one genuine $5 bundle saving', () => {
  const e=res({addons:{fridge:1,oven:1}});
  assert.equal(e.extras,65); assert.equal(e.firstSubtotal,215); assert.equal(e.total,242.95);
  assert.equal(e.lines.filter(l=>l.id==='bundleSaving').length,1);
  assert.equal(res({addons:{oven:1}}).extras,40);
});
test('Deep cleaning never bills included doors/baseboards again', () => {
  const e=res({plan:'deep',addons:{doors:2,baseboards:1,bedroom:1}});
  assert.equal(e.hours,4.5); assert.equal(e.base,247.5); assert.equal(e.extras,30);
  assert.equal(e.recurring,false);
});
test('Custom, unusual, specialist and heavy jobs need a visit, not a zero-dollar quote', () => {
  for (const patch of [{profile:'custom'},{condition:'heavy'},{plan:'specialist'},{profile:'invalid'}]) {
    const e=res(patch); assert.equal(e.requiresVisit,true); assert.equal('total' in e,false);
  }
  assert.equal(com({businessType:'specialist'}).requiresVisit,true);
  assert.equal(com({profile:'large',addons:{baseboards:1}}).requiresVisit,true);
});
test('Add-on-only minimum includes the selected work', () => {
  const e=res({plan:'extras',addons:{fridge:1,oven:1}});
  assert.equal(e.hours,0); assert.equal(e.firstSubtotal,150); assert.equal(e.total,169.5);
  assert.equal(e.lines.find(l=>l.id==='minimumVisit').total,85);
  assert.equal(res({plan:'extras',addons:{windows:20}}).firstSubtotal,200);
});
test('Quebec taxes rounded individually on the pre-tax amount', () => {
  const e=res({province:'Quebec',addons:{fridge:1,oven:1}});
  assert.deepEqual(e.taxes.map(t=>t.amount),[10.75,21.45]); assert.equal(e.total,247.2);
});
test('Commercial minimums, frequency, and deep-clean estimate', () => {
  assert.equal(com().firstSubtotal,90); assert.equal(com().monthly,390);
  assert.equal(com({plan:'once'}).firstSubtotal,150);
  assert.equal(com({plan:'deep',profile:'medium'}).hours,5.25);
  assert.equal(com({addons:{bedroom:2,linen:3}}).extras,30); // Linen is also offered commercially; bedroom extras remain residential.
});
test('Multiple weekly visits require a revised price, without requiring a site visit', () => {
  for (const visitsPerWeek of [2,3,4,5,6,7]) {
    for (const e of [res({plan:'flexible',visitsPerWeek}),com({visitsPerWeek})]) {
      assert.equal(e.requiresQuote,true); assert.equal(e.requiresRateReview,true);
      assert.equal(e.requiresVisit,false); assert.equal('total' in e,false);
      assert.equal('monthly' in e,false);
    }
  }
  assert.equal(com({visitsPerWeek:2,condition:'heavy'}).requiresVisit,true);
  assert.equal(res({plan:'flexible',profile:'custom'}).requiresVisit,true);
});
test('CRM retains custom schedules without a fabricated price or mandatory site visit', () => {
  const s={...initialSelection('residential'),plan:'flexible',visitsPerWeek:0,customFrequency:'Three mornings every 10 days',province:'Quebec',addons:{fridge:1}};
  const a=pricingAnswers(s,estimate(s),'en');
  assert.equal(a['Requested frequency'],s.customFrequency);
  assert.equal(a['Custom frequency details'],s.customFrequency);
  assert.equal(a['Visits per week'],'Custom');
  assert.equal(a['Frequency-based rate review required'],'Yes');
  assert.equal(a['Free on-site assessment required'],'No');
  assert.equal(a['Estimate province'],'Quebec');
  assert.equal(a['First visit total CAD'],undefined);
  assert.match(a['Selected add-ons'],/refrigerator/i);
  assert.deepEqual(JSON.parse(a['Selection JSON']),s);
  const standard=initialSelection('residential');
  assert.equal(pricingAnswers(standard,estimate(standard),'fr')['Recurring package saving before tax CAD'],'15');
});
test('Invalid quantities cannot create negative, infinite or excessive charges', () => {
  assert.equal(res({addons:{oven:-4,fridge:NaN,windows:Infinity}}).extras,0);
  assert.equal(res({addons:{oven:999}}).extras,40);
  assert.equal(res({addons:{walls:1}}).extras,110);
});
test('CRM answers preserve options and provenance for custom and priced requests', () => {
  const s={...initialSelection('residential'),condition:'heavy',addons:{oven:1}};
  const a=pricingAnswers(s,estimate(s),'fr');
  assert.match(a['Selected add-ons'],/four/); assert.equal(a['Free on-site assessment required'],'Yes');
  assert.deepEqual(JSON.parse(a['Selection JSON']),s);
  assert.equal(a['First visit total CAD'],undefined);
});
console.log(`${passed} pricing checks passed.`);
