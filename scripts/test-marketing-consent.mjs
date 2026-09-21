import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/marketing-consent.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
let moduleId = 0;
const fresh = () => import(`data:text/javascript;base64,${Buffer.from(`${js}\n// instance ${moduleId++}`).toString('base64')}`);
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };

function browser(path = '/') {
  const storage = new Map();
  const scripts = [];
  const calls = [];
  const cookies = [];
  globalThis.window = Object.assign(new EventTarget(), {
    location: new URL(path, 'https://ottawamultiservicesgroup.com'),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  });
  globalThis.document = {
    referrer: '',
    createElement: () => ({ dataset: {}, remove() {} }),
    head: { appendChild: script => scripts.push(script) },
    set cookie(value) { cookies.push(value); },
  };
  const load = () => {
    window.fbq.callMethod = (...args) => calls.push(args);
    calls.push(...window.fbq.queue.splice(0));
    scripts.at(-1).onload();
  };
  return { storage, scripts, calls, cookies, load, events: () => calls.filter(call => call[0] === 'track') };
}

await test('SSR is safe and unknown consent causes no Meta requests', async () => {
  delete globalThis.window;
  delete globalThis.document;
  const m = await fresh();
  assert.equal(m.getMarketingConsent(), null);
  m.syncMarketingTracking(); m.trackQuoteLead('cleaning'); m.openPrivacyPreferences();
  const b = browser();
  m.syncMarketingTracking(); m.trackQuoteLead('cleaning');
  assert.equal(b.scripts.length, 0);
});

await test('Malformed, future, unsupported and expired consent are rejected', async () => {
  const m = await fresh();
  const now = Date.now();
  for (const value of ['bad', '{}', JSON.stringify({ version: 2, status: 'accepted', timestamp: now }), JSON.stringify({ version: 1, status: 'accepted', timestamp: now + 1 }), JSON.stringify({ version: 1, status: 'accepted', timestamp: now - m.MARKETING_CONSENT_MAX_AGE })]) {
    assert.equal(m.parseMarketingConsent(value, now), null);
  }
  assert.equal(m.parseMarketingConsent(JSON.stringify({ version: 1, status: 'rejected', timestamp: now }), now)?.status, 'rejected');
});

await test('Refusal never loads the SDK; acceptance loads once and deduplicates PageView', async () => {
  const b = browser(); const m = await fresh();
  m.setMarketingConsent('rejected'); m.trackQuoteLead('cleaning');
  assert.equal(b.scripts.length, 0);
  m.setMarketingConsent('accepted'); m.syncMarketingTracking();
  assert.equal(b.scripts.length, 1);
  assert.equal(window.fbq.queue.some(call => call[0] === 'track'), false);
  b.load(); m.syncMarketingTracking();
  assert.deepEqual(b.events().map(call => call[1]), ['PageView']);
  assert.equal(b.calls.filter(call => call[0] === 'init').length, 1);
  assert.ok(b.calls.some(call => call[0] === 'set' && call[1] === 'autoConfig' && call[2] === false));
  window.location = new URL('/services', window.location.origin); m.syncMarketingTracking();
  assert.equal(b.events().filter(call => call[1] === 'PageView').length, 2);
});

await test('Withdrawal during SDK loading discards queued leads and sends no events', async () => {
  const b = browser('/quote'); const m = await fresh();
  m.setMarketingConsent('accepted'); m.trackQuoteLead('House Cleaning');
  m.setMarketingConsent('rejected'); b.load();
  assert.deepEqual(b.events(), []);
  assert.equal(b.calls.some(call => call[0] === 'init'), false);
  m.setMarketingConsent('accepted');
  assert.deepEqual(b.events().map(call => call[1]), ['PageView']);
  assert.ok(b.cookies.some(cookie => cookie.startsWith('_fbp=;')));
});

await test('Known service labels are canonicalized; customer/free-text values are dropped', async () => {
  const b = browser('/quote'); const m = await fresh();
  m.setMarketingConsent('accepted'); b.load();
  m.trackQuoteLead('House Cleaning'); m.trackQuoteLead('Office Cleaning');
  m.trackQuoteLead('jane@example.com'); m.trackQuoteLead('Jane Doe at 123 Main Street');
  assert.deepEqual(b.events().filter(call => call[1] === 'Lead').map(call => call[2]), [
    { content_name: 'cleaning', content_category: 'Quote Request' },
    { content_name: 'office', content_category: 'Quote Request' },
  ]);
  m.setMarketingConsent('rejected'); m.trackQuoteLead('cleaning');
  assert.equal(b.events().length, 3);
});

await test('Private paths, unknown paths and sensitive URLs never load advertising', async () => {
  for (const path of ['/portal', '/admin', '/admin/quotes/123', '/careers', '/partners', '/unknown', '/quote?email=jane%40example.com', '/?access_token=secret', '/#access_token=secret']) {
    const b = browser(path); const m = await fresh();
    m.setMarketingConsent('accepted'); m.trackQuoteLead('cleaning');
    assert.equal(b.scripts.length, 0, path);
  }
  const m = await fresh();
  assert.equal(m.isPublicMarketingUrl('/pricing/estimate?audience=commercial&plan=weekly'), true);
  assert.equal(m.isPublicMarketingUrl('/?utm_source=facebook&utm_campaign=cleaning&fbclid=abc_123'), true);
  assert.equal(m.isPublicMarketingUrl('/pricing#plans'), true);
  assert.equal(m.isPublicMarketingUrl('/?utm_content=jane%40example.com'), false);
  assert.equal(m.isPublicMarketingUrl('https://other.example/'), false);
});

await test('Navigation toward a private route blocks late SDK load before the URL changes', async () => {
  const b = browser('/'); const m = await fresh();
  m.setMarketingConsent('accepted'); m.trackQuoteLead('cleaning');
  m.guardMarketingNavigation('/portal'); b.load();
  assert.deepEqual(b.events(), []);
  window.location = new URL('/portal', window.location.origin); m.syncMarketingTracking();
  assert.deepEqual(b.events(), []);
  window.location = new URL('/services', window.location.origin); m.guardMarketingNavigation('/services'); m.syncMarketingTracking();
  assert.deepEqual(b.events().map(call => call[1]), ['PageView']);
});

await test('Private/sensitive referrers are not sent to Meta', async () => {
  for (const referrer of ['https://ottawamultiservicesgroup.com/portal?token=secret', 'https://other.example/?email=jane@example.com']) {
    const b = browser(); document.referrer = referrer; const m = await fresh();
    m.setMarketingConsent('accepted'); assert.equal(b.scripts.length, 0);
  }
});

await test('Storage write failure uses memory; cross-tab rejection and expiry stop tracking', async () => {
  const b = browser(); const m = await fresh();
  window.localStorage.setItem = () => { throw new Error('quota'); };
  m.setMarketingConsent('accepted'); assert.equal(m.getMarketingConsent()?.status, 'accepted'); b.load();
  b.storage.set(m.MARKETING_CONSENT_KEY, JSON.stringify({ version: 1, status: 'rejected', timestamp: Date.now() }));
  m.reloadMarketingConsentFromStorage(); m.syncMarketingTracking(); m.trackQuoteLead('cleaning');
  assert.equal(m.getMarketingConsent()?.status, 'rejected'); assert.equal(b.events().length, 1);
  b.storage.set(m.MARKETING_CONSENT_KEY, JSON.stringify({ version: 1, status: 'accepted', timestamp: Date.now() - m.MARKETING_CONSENT_MAX_AGE }));
  m.syncMarketingTracking(); m.trackQuoteLead('cleaning'); assert.equal(b.events().length, 1);
});

delete globalThis.window;
delete globalThis.document;
console.log(`${passed} marketing consent checks passed.`);
