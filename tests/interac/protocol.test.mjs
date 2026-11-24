import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { createLocalJWKSet, jwtVerify, SignJWT } from "jose";
import {
  createInteracFlow,
  getAuthorizationUrl,
  getInteracConfig,
  getInteracPublicJwks,
  verifyInteracCallback,
} from "../../src/features/interac/server/protocol.server.ts";

const { privateKey: partnerKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const { privateKey: hubKey, publicKey: hubPublic } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const origin = "https://gateway-portal.hub-verify.innovation.interac.ca";
const env = {
  INTERAC_CLIENT_ID: "fixture-client",
  INTERAC_SCOPE: "openid fixture-combined",
  INTERAC_ISSUER: origin,
  INTERAC_REDIRECT_URI: "https://example.invalid/api/interac/callback",
  INTERAC_PRIVATE_KEY_PEM: partnerKey.export({ type: "pkcs8", format: "pem" }),
};
const config = getInteracConfig(env);
const partnerJwks = getInteracPublicJwks(env);
const partnerVerifier = createLocalJWKSet(partnerJwks);
const metadata = {
  issuer: origin + "/",
  token_endpoint: origin + "/token",
  authorization_endpoint: origin + "/auth",
  userinfo_endpoint: origin + "/userinfo",
  jwks_uri: origin + "/jwks",
};
const bank = "com.securekey.verified.me";
const doc = "com.securekey.vids";
const match = "com.securekey.matching";
const subject = "fixture-subject";
const evidence = {
  sub: subject,
  [match]: {
    matchStatus: "CLEAR",
    identityData: { leftDigitalIdentity: bank, rightDigitalIdentity: doc },
  },
  [bank]: { source: "bank" },
  [doc]: { source: "driving_licence", scan_result: "CLEAR" },
};

function stubHub(
  t,
  flow,
  {
    proof = evidence,
    discovery = metadata,
    idClaims = {},
    grantScope = config.scope,
    signingKey = hubKey,
  } = {},
) {
  let sentBearer = false;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(new URL(url).origin, origin);
    assert.equal(init.redirect, "error");
    switch (new URL(url).pathname) {
      case "/.well-known/openid-configuration":
        return Response.json(discovery);
      case "/jwks":
        return Response.json({
          keys: [{ ...hubPublic.export({ format: "jwk" }), alg: "RS256", kid: "hub" }],
        });
      case "/token": {
        assert.equal(init.method, "POST");
        assert.equal(init.body.get("code_verifier"), flow.verifier);
        assert.equal(init.body.get("code"), "fixture-code");
        assert.equal(init.body.get("redirect_uri"), config.redirectUri);
        const assertion = init.body.get("client_assertion");
        const { payload } = await jwtVerify(assertion, partnerVerifier, {
          algorithms: ["RS256"],
          audience: metadata.token_endpoint,
          issuer: config.clientId,
        });
        assert.equal(payload.sub, config.clientId);
        assert.ok(payload.jti);
        const now = Math.floor(Date.now() / 1000);
        const id = new SignJWT({
          iss: metadata.issuer,
          aud: config.clientId,
          iat: now,
          exp: now + 180,
          sub: subject,
          nonce: flow.nonce,
          ...idClaims,
        });
        const token = await id.setProtectedHeader({ alg: "RS256", kid: "hub" }).sign(signingKey);
        return Response.json({
          access_token: "redacted-test-only",
          token_type: "bearer",
          scope: grantScope,
          id_token: token,
        });
      }
      case "/userinfo":
        assert.equal(init.headers.Authorization, "Bearer redacted-test-only");
        sentBearer = true;
        return Response.json(proof);
      default:
        throw Error("Unexpected URL");
    }
  });
  return () => sentBearer;
}

test("public partner JWKS is available for registration before the client ID; production and malformed config are disabled", () => {
  assert.equal(partnerJwks.keys.length, 1);
  const { kid, kty, n, e } = partnerJwks.keys[0];
  assert.equal(kid, createHash("sha256").update(JSON.stringify({ e, kty, n })).digest("base64url"));
  assert.deepEqual(Object.keys(partnerJwks.keys[0]).sort(), ["alg", "e", "kid", "kty", "n", "use"]);
  assert.deepEqual(
    partnerJwks,
    getInteracPublicJwks({ INTERAC_PRIVATE_KEY_PEM: env.INTERAC_PRIVATE_KEY_PEM }),
  );
  for (const modified of [
    { VERCEL_ENV: "production" },
    { INTERAC_PRIVATE_KEY_PEM: "" },
    { INTERAC_ISSUER: "https://production.example.invalid" },
    { INTERAC_SCOPE: "openid" },
    { INTERAC_REDIRECT_URI: "http://example.invalid/callback" },
  ])
    assert.equal(getInteracConfig({ ...env, ...modified }), null);
});

test("sandbox authorization signs state, nonce, exact issuer and a PKCE S256 challenge", async (t) => {
  const flow = createInteracFlow();
  stubHub(t, flow);
  const auth = new URL(await getAuthorizationUrl(config, flow, "fr"));
  assert.equal(auth.origin + auth.pathname, metadata.authorization_endpoint);
  assert.equal(auth.searchParams.get("state"), flow.state);
  const { payload } = await jwtVerify(auth.searchParams.get("request"), partnerVerifier, {
    algorithms: ["RS256"],
    audience: metadata.issuer,
    issuer: config.clientId,
  });
  assert.equal(payload.state, flow.state);
  assert.equal(payload.nonce, flow.nonce);
  assert.equal(payload.ui_locales, "fr-CA");
  assert.equal(payload.code_challenge_method, "S256");
  assert.equal(
    payload.code_challenge,
    createHash("sha256").update(flow.verifier).digest("base64url"),
  );
  assert.notEqual(createInteracFlow().state, flow.state);
});

test("accepts combined confirmed claims and discards both identity profiles", async (t) => {
  const flow = createInteracFlow();
  const readEvidence = stubHub(t, flow);
  assert.equal(await verifyInteracCallback(config, flow, "fixture-code"), undefined);
  assert.equal(readEvidence(), true);
});

for (const [name, options] of [
  ["document-only result", { proof: { sub: subject, source: "passport", scan_result: "CLEAR" } }],
  [
    "bank-to-submitted-profile matching alone",
    {
      proof: {
        ...evidence,
        [match]: {
          matchStatus: "CLEAR",
          identityData: { leftDigitalIdentity: bank, rightDigitalIdentity: "request.subject" },
        },
      },
    },
  ],
  [
    "inconsistent document result",
    { proof: { ...evidence, [doc]: { source: "passport", scan_result: "SUSPECTED" } } },
  ],
  [
    "cross-source match rejected",
    { proof: { ...evidence, [match]: { ...evidence[match], matchStatus: "REJECTED" } } },
  ],
  ["user-info subject differs", { proof: { ...evidence, sub: "different-subject" } }],
  ["issuer substitution", { idClaims: { iss: "https://other.invalid/" } }],
  ["invalid hub signature", { signingKey: partnerKey }],
  ["different nonce", { idClaims: { nonce: "other-flow" } }],
  ["different audience", { idClaims: { aud: "other-client" } }],
  ["scope dropped by provider", { grantScope: "openid" }],
  ["expired ID token", { idClaims: { exp: 1 } }],
  ["mismatched access-token hash", { idClaims: { at_hash: "wrong" } }],
  [
    "cross-origin metadata",
    { discovery: { ...metadata, token_endpoint: "https://other.invalid/token" } },
  ],
]) {
  test("fails closed for " + name, async (t) => {
    const flow = createInteracFlow();
    stubHub(t, flow, options);
    await assert.rejects(verifyInteracCallback(config, flow, "fixture-code"), {
      message: "Interac sandbox verification could not be confirmed.",
    });
  });
}
