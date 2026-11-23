import { createHash, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getInteracConfig } from "./protocol.server";

const databaseOrigin = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const errors = new Set(["rate_limited", "already_verified", "account_required"]);

export class InteracBridgeError extends Error {
  constructor(readonly code: string) {
    super("The Interac sandbox database request could not be completed.");
  }
}

// The preview can authorize only the three sandbox operations. The database's
// service credential stays inside its own Edge Function.
export async function callInteracBridge(
  operation: "start" | "claim" | "finish",
  args: Record<string, unknown>,
): Promise<unknown> {
  const config = getInteracConfig();
  if (process.env.VERCEL_ENV !== "preview" || !config) throw new InteracBridgeError("unavailable");
  const body = JSON.stringify({ operation, args });
  try {
    const assertion = await new SignJWT({
      body_sha256: createHash("sha256").update(body).digest("hex"),
    })
      .setProtectedHeader({
        alg: "RS256",
        typ: "omsg-interac-bridge+jwt",
        kid: config.signingKey.jwk.kid,
      })
      .setIssuer("urn:omsg:interac:preview")
      .setAudience("urn:omsg:interac:db:vdeeevxpwjvztsoonuxx")
      .setIssuedAt()
      .setExpirationTime("30s")
      .setJti(randomUUID())
      .sign(config.signingKey.privateKey);
    const response = await fetch(databaseOrigin + "/functions/v1/interac-sandbox-bridge", {
      method: "POST",
      headers: { Authorization: "Bearer " + assertion, "Content-Type": "application/json" },
      body,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !Object.hasOwn(result, "data")) {
      throw new InteracBridgeError(errors.has(result?.error) ? result.error : "unavailable");
    }
    return result.data;
  } catch (error) {
    if (error instanceof InteracBridgeError) throw error;
    throw new InteracBridgeError("unavailable");
  }
}
