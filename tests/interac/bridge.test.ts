import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { before, test } from "node:test";
import { calculateJwkThumbprint, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createBridge } from "../../supabase/functions/interac-sandbox-bridge/index.ts";

const origin = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const url = origin + "/functions/v1/interac-sandbox-bridge";
const audience = "urn:omsg:interac:db:vdeeevxpwjvztsoonuxx";
const serviceKey = "test-only-key";
const claim = { operation: "claim", args: { p_state_hash: "a".repeat(64), p_browser_hash: "b".repeat(64) } };
let privateKey: CryptoKey;
let publicKey: JsonWebKey & { kid: string };

before(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  privateKey = keys.privateKey;
  const material = await exportJWK(keys.publicKey);
  publicKey = { ...material, alg: "RS256", use: "sig", kid: await calculateJwkThumbprint(material) };
});

async function request(command: unknown, options: { audience?: string; offset?: number; actual?: unknown } = {}) {
  const now = Math.floor(Date.now() / 1000) + (options.offset ?? 0);
  const token = await new SignJWT({ body_sha256: createHash("sha256").update(JSON.stringify(command)).digest("hex") })
    .setProtectedHeader({ alg: "RS256", kid: publicKey.kid, typ: "omsg-interac-bridge+jwt" })
    .setIssuer("urn:omsg:interac:preview").setAudience(options.audience ?? audience)
    .setIssuedAt(now).setExpirationTime(now + 30).setJti(randomUUID()).sign(privateKey);
  return new Request(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(options.actual ?? command) });
}

test("the sandbox exposes its public key without allowing an unsigned write", async () => {
  const noRequest = () => { throw new Error("Unexpected REST request"); };
  const handler = createBridge(origin, serviceKey, publicKey, noRequest);
  const response = await handler(new Request(url + "/jwks"));
  assert.deepEqual(await response.json(), { keys: [publicKey] });
  assert.equal((await handler(new Request(url, { method: "POST", body: "{}" }))).status, 401);
  const wrongProject = createBridge("https://other-project.supabase.co", serviceKey, publicKey, noRequest);
  assert.equal((await wrongProject(new Request(url + "/jwks"))).status, 503);
});

test("a signed claim reaches its fixed RPC and returns only expected data", async () => {
  const stored = { attempt_id: randomUUID(), user_id: randomUUID(), nonce: "n".repeat(32), verifier: "v".repeat(48) };
  let called = false;
  const handler = createBridge(origin, serviceKey, publicKey, async (target, init) => {
    called = true;
    assert.equal(target, origin + "/rest/v1/rpc/interac_sandbox_claim");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("apikey"), serviceKey);
    assert.deepEqual(JSON.parse(String(init?.body)), claim.args);
    return Response.json([{ ...stored, unexpected: "discard" }]);
  });
  const response = await handler(await request(claim));
  assert.equal(called, true);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [stored] });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("only current assertions for this audience, method and signed body are accepted", async () => {
  let calls = 0;
  const handler = createBridge(origin, serviceKey, publicKey, async () => { calls++; return Response.json([]); });
  for (const options of [{ audience: "different" }, { offset: -100 }, { actual: { ...claim, operation: "start" } }]) {
    assert.equal((await handler(await request(claim, options))).status, 401);
  }
  assert.equal((await handler(await request({ ...claim, args: { ...claim.args, unexpected: true } }))).status, 400);
  assert.equal(calls, 0);
});

test("database errors expose only defined public result codes", async () => {
  for (const [message, status, error] of [
    ["interac_sandbox_rate_limited", 429, "rate_limited"],
    ["interac_sandbox_profile_required", 403, "account_required"],
    ["database detail", 503, "unavailable"],
  ] as const) {
    const handler = createBridge(origin, serviceKey, publicKey, async () =>
      Response.json({ message, details: "discard" }, { status: 400 }));
    const response = await handler(await request(claim));
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error });
  }
});
