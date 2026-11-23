import partnerJwk from "./partner-jwk.json" with { type: "json" };

const PROJECT_REF = "vdeeevxpwjvztsoonuxx";
const SUPABASE_ORIGIN = `https://${PROJECT_REF}.supabase.co`;
const ISSUER = "urn:omsg:interac:preview";
const AUDIENCE = `urn:omsg:interac:db:${PROJECT_REF}`;
const TYPE = "omsg-interac-bridge+jwt";
const ROOT_PATH = /^\/(?:functions\/v1\/)?interac-sandbox-bridge\/?$/;
const JWKS_PATH = /^\/(?:functions\/v1\/)?interac-sandbox-bridge\/jwks\/?$/;
const DIGEST = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const MAX_BODY_BYTES = 4096;
const encoder = new TextEncoder();
const utf8 = new TextDecoder("utf-8", { fatal: true });

const parameters = {
  start: { p_user_id: UUID, p_state_hash: DIGEST, p_browser_hash: DIGEST, p_nonce: NONCE, p_verifier: VERIFIER },
  claim: { p_state_hash: DIGEST, p_browser_hash: DIGEST },
  finish: { p_attempt_id: UUID, p_outcome: /^(verified|failed)$/ },
};

type Operation = keyof typeof parameters;
type PublicKey = { kty: "RSA"; use: "sig"; alg: "RS256"; kid: string; n: string; e: string };
type ErrorCode = "unauthorized" | "unavailable" | "account_required" | "rate_limited" | "already_verified";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
}

function publicKey(raw: unknown): PublicKey {
  if (!isObject(raw) || raw.kty !== "RSA" || raw.alg !== "RS256" || raw.use !== "sig" ||
    !NONCE.test(String(raw.kid)) || typeof raw.kid !== "string" || typeof raw.n !== "string" ||
    typeof raw.e !== "string" || decodeBase64Url(raw.n).length < 256 ||
    ["d", "p", "q", "dp", "dq", "qi", "oth"].some(key => Object.hasOwn(raw, key))) {
    throw new Error("Invalid public key");
  }
  return { kty: "RSA", alg: "RS256", use: "sig", kid: raw.kid, n: raw.n, e: raw.e };
}

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function fail(error: ErrorCode, status: number) {
  return json({ error }, status);
}

// Only the signing key bundled with this test branch can authorize a write.
// Verify the signature before evaluating the claims or reading the request body.
async function signedDigest(header: string | null, jwk: PublicKey, key: CryptoKey) {
  if (!header || header.length > 4096) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/i.exec(header);
  if (!match) return null;
  try {
    const [, protectedPart, payloadPart, signature] = match;
    const protectedHeader = JSON.parse(utf8.decode(decodeBase64Url(protectedPart)));
    if (!isObject(protectedHeader) || Object.keys(protectedHeader).length !== 3 ||
      protectedHeader.typ !== TYPE || protectedHeader.alg !== "RS256" || protectedHeader.kid !== jwk.kid) return null;
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(signature),
      encoder.encode(`${protectedPart}.${payloadPart}`));
    if (!valid) return null;
    const claims = JSON.parse(utf8.decode(decodeBase64Url(payloadPart)));
    if (!isObject(claims) || claims.iss !== ISSUER || claims.aud !== AUDIENCE) return null;
    const { iat, exp, jti, body_sha256: digest } = claims;
    const now = Math.floor(Date.now() / 1000);
    if (typeof iat !== "number" || typeof exp !== "number" || !Number.isSafeInteger(iat) ||
      !Number.isSafeInteger(exp) || iat > now + 3 || exp <= now || exp <= iat || exp - iat > 45 ||
      typeof jti !== "string" || !NONCE.test(jti) || typeof digest !== "string" || !DIGEST.test(digest)) return null;
    return digest;
  } catch {
    return null;
  }
}

async function readBody(request: Request) {
  if (!request.body || Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) return null;
  const reader = request.body.getReader();
  const buffer = new Uint8Array(MAX_BODY_BYTES);
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
    return buffer.subarray(0, size);
  } finally {
    reader.releaseLock();
  }
}

function parseOperation(value: unknown): { operation: Operation; args: Record<string, unknown> } | null {
  if (!isObject(value) || Object.keys(value).length !== 2 || typeof value.operation !== "string" ||
    !Object.hasOwn(parameters, value.operation) || !isObject(value.args)) return null;
  const operation = value.operation as Operation;
  const args = value.args;
  const fields = Object.entries(parameters[operation]);
  if (Object.keys(args).length !== fields.length || !fields.every(([key, pattern]) =>
    typeof args[key] === "string" && pattern.test(args[key]))) return null;
  return { operation, args };
}

function result(operation: Operation, data: unknown) {
  if (operation === "start" && typeof data === "string" && UUID.test(data)) return json({ data });
  if (operation === "finish" && typeof data === "boolean") return json({ data });
  if (operation === "claim" && Array.isArray(data)) {
    if (data.length === 0) return json({ data: [] });
    if (data.length === 1 && isObject(data[0])) {
      const { attempt_id, user_id, nonce, verifier } = data[0];
      if (typeof attempt_id === "string" && UUID.test(attempt_id) &&
        typeof user_id === "string" && UUID.test(user_id) &&
        typeof nonce === "string" && NONCE.test(nonce) &&
        typeof verifier === "string" && VERIFIER.test(verifier)) {
        return json({ data: [{ attempt_id, user_id, nonce, verifier }] });
      }
    }
  }
  return fail("unavailable", 503);
}

export function createBridge(projectUrl: string | undefined, serviceKey: string | undefined,
  rawJwk: unknown, fetcher: typeof fetch = fetch) {
  const jwk = publicKey(rawJwk);
  let imported: Promise<CryptoKey> | undefined;
  return async (request: Request): Promise<Response> => {
    if (projectUrl?.replace(/\/$/, "") !== SUPABASE_ORIGIN) return fail("unavailable", 503);
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && JWKS_PATH.test(path)) return json({ keys: [jwk] });
    if (request.method !== "POST" || !ROOT_PATH.test(path)) return fail("unavailable", 404);
    if (!serviceKey) return fail("unavailable", 503);
    try {
      imported ??= crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      const expected = await signedDigest(request.headers.get("Authorization"), jwk, await imported);
      if (!expected) return fail("unauthorized", 401);
      if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") return fail("unauthorized", 415);
      const bytes = await readBody(request);
      if (!bytes) return fail("unauthorized", 413);
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      if (Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join("") !== expected) return fail("unauthorized", 401);
      let payload: unknown;
      try { payload = JSON.parse(utf8.decode(bytes)); } catch { return fail("unauthorized", 400); }
      const command = parseOperation(payload);
      if (!command) return fail("unauthorized", 400);
      const response = await fetcher(`${SUPABASE_ORIGIN}/rest/v1/rpc/interac_sandbox_${command.operation}`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(command.args),
        redirect: "error",
        signal: AbortSignal.timeout(7000),
      });
      const data: unknown = await response.json();
      if (response.ok) return result(command.operation, data);
      switch (isObject(data) ? data.message : null) {
        case "interac_sandbox_rate_limited": return fail("rate_limited", 429);
        case "interac_sandbox_already_verified": return fail("already_verified", 409);
        case "interac_sandbox_profile_required": return fail("account_required", 403);
        default: return fail("unavailable", 503);
      }
    } catch {
      return fail("unavailable", 503);
    }
  };
}

if (typeof Deno !== "undefined") {
  Deno.serve(createBridge(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), partnerJwk));
}
