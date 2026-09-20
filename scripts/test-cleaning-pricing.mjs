import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the production calculation module, with the existing TypeScript dependency.
const source = readFileSync(new URL('../src/lib/cleaning-pricing.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { calculateCleaningEstimate: estimate, initialSelection, pricingAnswers } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
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
test('Weekly and monthly calendars use annualized visits', () => {
  assert.equal(res({plan:'weekly'}).monthly,585);
  assert.equal(res({plan:'monthly'}).monthly,144);
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
  assert.equal(com({visitsPerWeek:3}).monthly,1170);
  assert.equal(com({plan:'once'}).firstSubtotal,150);
  assert.equal(com({plan:'deep',profile:'medium'}).hours,5.25);
  assert.equal(com({addons:{bedroom:2,linen:3}}).extras,0);
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
