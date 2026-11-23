// @vitest-environment node
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { callInteracBridge, InteracBridgeError } from "../../src/features/interac/server/bridge.server";
import { getInteracPublicJwks } from "../../src/features/interac/server/protocol.server";
import { createBridge } from "../../supabase/functions/interac-sandbox-bridge/index";

const project = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const serviceKey = "synthetic-edge-only-key";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const args = {
  p_user_id: randomUUID(),
  p_state_hash: "a".repeat(64),
  p_browser_hash: "b".repeat(64),
  p_nonce: "c".repeat(32),
  p_verifier: "d".repeat(64),
};

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("INTERAC_ISSUER", "https://gateway-portal.hub-verify.innovation.interac.ca");
  vi.stubEnv("INTERAC_CLIENT_ID", "synthetic-client");
  vi.stubEnv("INTERAC_SCOPE", "openid synthetic-scope");
  vi.stubEnv("INTERAC_REDIRECT_URI", "https://preview.example/api/interac/callback");
  vi.stubEnv("INTERAC_PRIVATE_KEY_PEM", privateKey.export({ type: "pkcs8", format: "pem" }).toString());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Loop the Vercel HTTP request through the actual Edge handler. Only the
// downstream PostgREST response is scripted. WebCrypto checks the real JWT.
function connect(restResult: Response) {
  const rest = vi.fn<typeof fetch>(async () => restResult);
  const [jwk] = getInteracPublicJwks().keys;
  const edge = createBridge(project, serviceKey, jwk, rest);
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.url).toBe(project + "/functions/v1/interac-sandbox-bridge");
    expect(request.headers.has("apikey")).toBe(false);
    return edge(request);
  });
  return rest;
}

it("uses a valid Vercel signature and body digest to start exactly one sandbox RPC", async () => {
  const attemptId = randomUUID();
  const rest = connect(Response.json(attemptId));
  await expect(callInteracBridge("start", args)).resolves.toBe(attemptId);
  expect(rest).toHaveBeenCalledTimes(1);
  const [url, init] = rest.mock.calls[0];
  expect(url).toBe(project + "/rest/v1/rpc/interac_sandbox_start");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual(args);
  expect(new Headers(init?.headers).get("apikey")).toBe(serviceKey);
});

it("returns a typed rate limit to Vercel without forwarding database details", async () => {
  const rest = connect(Response.json({ message: "interac_sandbox_rate_limited", details: "internal" }, { status: 400 }));
  const error = await callInteracBridge("start", args).catch((cause: unknown) => cause);
  expect(error).toBeInstanceOf(InteracBridgeError);
  expect((error as InteracBridgeError).code).toBe("rate_limited");
  expect((error as Error).message).not.toContain("internal");
  expect(rest).toHaveBeenCalledTimes(1);
});
