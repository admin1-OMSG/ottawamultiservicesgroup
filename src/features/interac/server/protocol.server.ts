// Interac Hub Developer Portal: synchronous combined bank + document verification.
// This server-only adapter accepts the sandbox issuer and returns no identity data.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type { KeyObject } from "node:crypto";
import { createLocalJWKSet, jwtVerify, SignJWT } from "jose";
import type { JSONWebKeySet } from "jose";

const SANDBOX_ORIGIN = "https://gateway-portal.hub-verify.innovation.interac.ca";
const BANK = "com.securekey.verified.me";
const DOCUMENT = "com.securekey.vids";
const DOCUMENT_SOURCES = new Set([
  "driving_licence",
  "passport",
  "national_identity_card",
  "residence_permit",
  "indigenous_card",
  "national_health_insurance_card",
]);

type Env = Readonly<Record<string, string | undefined>>;
type Json = Record<string, unknown>;
type PublicKey = { kty: "RSA"; n: string; e: string; use: "sig"; alg: "RS256"; kid: string };
type SigningKey = { privateKey: KeyObject; jwk: PublicKey };

export type InteracFlow = { state: string; nonce: string; verifier: string };
export type InteracConfig = {
  clientId: string;
  scope: string;
  issuer: string;
  redirectUri: string;
  signingKey: SigningKey;
};

function badResponse(): never {
  throw new Error("Interac sandbox verification could not be confirmed.");
}

function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return badResponse();
  return value as Json;
}

function sandboxUrl(value: unknown): string {
  if (typeof value !== "string") return badResponse();
  const url = new URL(value);
  if (url.origin !== SANDBOX_ORIGIN || url.username || url.password || url.hash || url.search) {
    return badResponse();
  }
  return url.href;
}

function signingKey(env: Env): SigningKey | null {
  if (env.VERCEL_ENV === "production" || !env.INTERAC_PRIVATE_KEY_PEM) return null;
  try {
    const privateKey = createPrivateKey(env.INTERAC_PRIVATE_KEY_PEM.replace(/\\n/g, "\n"));
    if (
      privateKey.asymmetricKeyType !== "rsa" ||
      (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    )
      return null;
    const { n, e } = createPublicKey(privateKey).export({ format: "jwk" });
    if (!n || !e) return null;
    // Derive a stable key ID for Interac's registered JWKS using RFC 7638.
    const kid = createHash("sha256")
      .update(JSON.stringify({ e, kty: "RSA", n }))
      .digest("base64url");
    return { privateKey, jwk: { kty: "RSA", n, e, use: "sig", alg: "RS256", kid } };
  } catch {
    return null;
  }
}

export function getInteracPublicJwks(env: Env = process.env) {
  const key = signingKey(env);
  return { keys: key ? [key.jwk] : [] };
}

export function getInteracConfig(env: Env = process.env): InteracConfig | null {
  const key = signingKey(env);
  const clientId = env.INTERAC_CLIENT_ID?.trim();
  const scope = env.INTERAC_SCOPE?.trim().replace(/\s+/g, " ");
  const issuer = env.INTERAC_ISSUER?.trim();
  const redirectUri = env.INTERAC_REDIRECT_URI?.trim();
  if (!key || !clientId || !scope || !issuer || !redirectUri) return null;
  const scopes = scope.split(" ");
  if (!scopes.includes("openid") || scopes.length < 2) return null;
  try {
    if (sandboxUrl(issuer) !== SANDBOX_ORIGIN + "/") return null;
    const redirect = new URL(redirectUri);
    if (
      redirect.protocol !== "https:" ||
      redirect.username ||
      redirect.password ||
      redirect.search ||
      redirect.hash
    )
      return null;
    return { clientId, scope, issuer, redirectUri, signingKey: key };
  } catch {
    return null;
  }
}

export function createInteracFlow(): InteracFlow {
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    verifier: randomBytes(64).toString("base64url"),
  };
}

// Fail closed on redirects. Authorization codes, tokens and provider claims must
// remain on the pinned issuer's origin and never appear in thrown errors.
async function getJson(url: string, init?: RequestInit): Promise<Json> {
  try {
    const response = await fetch(sandboxUrl(url), {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !response.body) return badResponse();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 256 * 1024) {
        await reader.cancel();
        return badResponse();
      }
      chunks.push(value);
    }
    return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return badResponse();
  }
}

async function discovery(config: InteracConfig) {
  const metadata = await getJson(SANDBOX_ORIGIN + "/.well-known/openid-configuration");
  if (
    typeof metadata.issuer !== "string" ||
    sandboxUrl(metadata.issuer) !== sandboxUrl(config.issuer)
  ) {
    return badResponse();
  }
  return {
    // Preserve the provider's exact issuer string, including any trailing slash.
    issuer: metadata.issuer,
    authorization: sandboxUrl(metadata.authorization_endpoint),
    token: sandboxUrl(metadata.token_endpoint),
    userinfo: sandboxUrl(metadata.userinfo_endpoint),
    jwks: sandboxUrl(metadata.jwks_uri),
  };
}

export async function getAuthorizationUrl(
  config: InteracConfig,
  flow: InteracFlow,
  locale: "fr" | "en",
): Promise<string> {
  const endpoints = await discovery(config);
  const params = {
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: flow.state,
  };
  const request = await new SignJWT({
    ...params,
    nonce: flow.nonce,
    ui_locales: locale === "fr" ? "fr-CA" : "en-CA",
    code_challenge: createHash("sha256").update(flow.verifier).digest("base64url"),
    code_challenge_method: "S256",
  })
    .setProtectedHeader({ alg: "RS256", kid: config.signingKey.jwk.kid })
    .setIssuer(config.clientId)
    .setAudience(endpoints.issuer)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(config.signingKey.privateKey);
  const target = new URL(endpoints.authorization);
  target.search = new URLSearchParams({ ...params, request }).toString();
  return target.href;
}

function verifyCombinedClaims(claims: Json, subject: string) {
  if (claims.sub !== subject) return badResponse();
  const matching = object(claims["com.securekey.matching"]);
  const identities = object(matching.identityData);
  const sources = new Set([identities.leftDigitalIdentity, identities.rightDigitalIdentity]);
  const bank = object(claims[BANK]);
  const document = object(claims[DOCUMENT]);
  if (
    matching.matchStatus !== "CLEAR" ||
    !sources.has(BANK) ||
    !sources.has(DOCUMENT) ||
    bank.source !== "bank" ||
    document.scan_result !== "CLEAR" ||
    typeof document.source !== "string" ||
    !DOCUMENT_SOURCES.has(document.source)
  ) {
    return badResponse();
  }
}

function sameScopes(value: unknown, expected: string) {
  if (typeof value !== "string") return false;
  const scopes = new Set(value.trim().split(/\s+/));
  const wanted = expected.split(" ");
  return scopes.size === wanted.length && wanted.every((scope) => scopes.has(scope));
}

// The caller must already have matched the state to a one-use transaction and
// the same browser/user. This function only returns on an affirmative dual result.
export async function verifyInteracCallback(
  config: InteracConfig,
  flow: InteracFlow,
  code: string,
): Promise<void> {
  try {
    if (!code || code.length > 4096) return badResponse();
    const endpoints = await discovery(config);
    const assertion = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: config.signingKey.jwk.kid })
      .setIssuer(config.clientId)
      .setSubject(config.clientId)
      .setAudience(endpoints.token)
      .setIssuedAt()
      .setExpirationTime("2m")
      .setJti(randomUUID())
      .sign(config.signingKey.privateKey);
    const tokens = await getJson(endpoints.token, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        code_verifier: flow.verifier,
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: assertion,
      }),
    });
    if (
      typeof tokens.id_token !== "string" ||
      typeof tokens.access_token !== "string" ||
      !tokens.access_token ||
      tokens.access_token.length > 32768 ||
      typeof tokens.token_type !== "string" ||
      tokens.token_type.toLowerCase() !== "bearer" ||
      !sameScopes(tokens.scope, config.scope)
    )
      return badResponse();

    const keySet = await getJson(endpoints.jwks);
    if (!Array.isArray(keySet.keys) || !keySet.keys.length) return badResponse();
    const keys = createLocalJWKSet(keySet as unknown as JSONWebKeySet);
    const { payload } = await jwtVerify(tokens.id_token, keys, {
      algorithms: ["RS256"],
      issuer: endpoints.issuer,
      audience: config.clientId,
      requiredClaims: ["sub", "nonce", "exp", "iat"],
      clockTolerance: 10,
      maxTokenAge: "5m",
    });
    if (
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.nonce !== flow.nonce ||
      ((payload.azp !== undefined || (Array.isArray(payload.aud) && payload.aud.length > 1)) &&
        payload.azp !== config.clientId)
    )
      return badResponse();
    if (payload.at_hash !== undefined) {
      const atHash = createHash("sha256")
        .update(tokens.access_token, "ascii")
        .digest()
        .subarray(0, 16)
        .toString("base64url");
      if (payload.at_hash !== atHash) return badResponse();
    }
    const claims = await getJson(endpoints.userinfo, {
      headers: { Authorization: "Bearer " + tokens.access_token, Accept: "application/json" },
    });
    verifyCombinedClaims(claims, payload.sub);
  } catch {
    return badResponse();
  }
}
