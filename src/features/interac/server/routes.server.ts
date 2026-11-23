import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { callInteracBridge, InteracBridgeError } from "./bridge.server";
import {
  createInteracFlow,
  getAuthorizationUrl,
  getInteracConfig,
  verifyInteracCallback,
} from "./protocol.server";

const SITE = "https://ottawamultiservicesgroup-git-codex-professional-onboarding-omsg.vercel.app";
const DATABASE = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const CALLBACK_PATH = "/api/interac/callback";
const COOKIE_NAME = "__Secure-omsg-interac";
const SAFE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function isSandbox(request: Request): boolean {
  return (
    process.env.VERCEL_ENV === "preview" &&
    process.env.VITE_INTERAC_SANDBOX_ENABLED === "true" &&
    process.env.VITE_SUPABASE_URL === DATABASE &&
    new URL(request.url).origin === SITE
  );
}

function configuredProvider() {
  const config = getInteracConfig();
  return config?.redirectUri === SITE + CALLBACK_PATH ? config : null;
}

function json(data: unknown, status: number, cookie?: string) {
  const headers = new Headers(SAFE_HEADERS);
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json(data, { status, headers });
}

class RequestFailure extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function failureResponse(error: unknown) {
  if (error instanceof RequestFailure) return json({ error: error.code }, error.status);
  if (error instanceof InteracBridgeError) {
    if (error.code === "rate_limited") return json({ error: "rate_limited" }, 429);
    if (error.code === "already_verified") return json({ error: "already_verified" }, 409);
    if (error.code === "account_required") return json({ error: "account_required" }, 403);
  }
  return json({ error: "unavailable" }, 503);
}

async function professional(request: Request) {
  if (!isSandbox(request)) throw new RequestFailure("unavailable", 404);
  const credential = request.headers.get("Authorization") ?? "";
  const bearer = /^Bearer ([^\s,]{1,16384})$/i.exec(credential)?.[1];
  if (!bearer) throw new RequestFailure("unauthorized", 401);
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new RequestFailure("unavailable", 503);
  const client = createClient(DATABASE, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });

  const { data, error } = await client.auth.getUser(bearer);
  if (error && (!error.status || error.status === 429 || error.status >= 500)) {
    throw new RequestFailure("unavailable", 503);
  }
  if (error || !data.user || !data.user.email_confirmed_at || data.user.is_anonymous) {
    throw new RequestFailure("unauthorized", 401);
  }
  const profile = await client
    .from("professional_accounts")
    .select("review_status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (profile.error) throw new RequestFailure("unavailable", 503);
  if (!profile.data || profile.data.review_status === "suspended") {
    throw new RequestFailure("account_required", 403);
  }
  return { client, userId: data.user.id };
}

const visibleStatuses = new Map([
  ["not_started", "not_started"],
  ["pending", "pending"],
  ["verified", "sandbox_verified"],
  ["failed", "retry"],
  ["expired", "retry"],
]);

export async function interacStatus(request: Request): Promise<Response> {
  try {
    const { client } = await professional(request);
    const { data, error } = await client.rpc("get_my_interac_sandbox_status");
    const status = Array.isArray(data) && data.length === 1 && visibleStatuses.get(data[0]?.status);
    if (error || !status) throw new RequestFailure("unavailable", 503);
    return json({ available: !!configuredProvider(), status }, 200);
  } catch (error) {
    return failureResponse(error);
  }
}

async function readConsent(request: Request): Promise<"fr" | "en"> {
  if (request.headers.get("origin") !== SITE) throw new RequestFailure("forbidden", 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  ) {
    throw new RequestFailure("invalid_request", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestFailure("invalid_request", 400);
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024) {
      await reader.cancel();
      throw new RequestFailure("invalid_request", 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  try {
    const body = JSON.parse(text + decoder.decode());
    if (body?.consent === true && (body.locale === "en-CA" || body.locale === "fr-CA")) {
      return body.locale === "fr-CA" ? "fr" : "en";
    }
  } catch {
    // Malformed input receives the same generic client response.
  }
  throw new RequestFailure("invalid_request", 400);
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function cookie(value: string, maxAge: number): string {
  return `${COOKIE_NAME}=${value}; Path=${CALLBACK_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readBinding(request: Request, state: string): string | null {
  const cookies = (request.headers.get("cookie") ?? "").split(";").map((field) => field.trim());
  const matches = cookies.filter((field) => field.startsWith(COOKIE_NAME + "="));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(COOKIE_NAME.length + 1);
  if (!value.startsWith(state + ".")) return null;
  const binding = value.slice(state.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(binding) ? binding : null;
}

export async function interacStart(request: Request): Promise<Response> {
  try {
    if (!isSandbox(request)) throw new RequestFailure("unavailable", 404);
    const locale = await readConsent(request);
    const { userId } = await professional(request);
    const config = configuredProvider();
    if (!config) throw new RequestFailure("unavailable", 503);

    const flow = createInteracFlow();
    const binding = randomBytes(32).toString("base64url");
    // Resolve the provider before superseding an existing attempt. A discovery
    // outage must not invalidate the professional's current browser binding.
    const url = await getAuthorizationUrl(config, flow, locale);
    await callInteracBridge("start", {
      p_user_id: userId,
      p_state_hash: digest(flow.state),
      p_browser_hash: digest(binding),
      p_nonce: flow.nonce,
      p_verifier: flow.verifier,
    });
    return json({ url }, 200, cookie(flow.state + "." + binding, 900));
  } catch (error) {
    return failureResponse(error);
  }
}

type ClaimedAttempt = { attempt_id: string; user_id: string; nonce: string; verifier: string };

function singleAttempt(data: unknown): ClaimedAttempt | null {
  if (!Array.isArray(data) || data.length !== 1) return null;
  const item = data[0];
  if (
    !item ||
    typeof item !== "object" ||
    typeof item.attempt_id !== "string" ||
    typeof item.user_id !== "string" ||
    typeof item.nonce !== "string" ||
    typeof item.verifier !== "string"
  )
    return null;
  return item;
}

export async function interacCallback(request: Request): Promise<Response> {
  if (!isSandbox(request)) return json({ error: "unavailable" }, 404);
  const headers = new Headers({ ...SAFE_HEADERS, Location: SITE + "/pro" });
  try {
    const params = new URL(request.url).searchParams;
    const states = params.getAll("state");
    const state = states[0];
    const config = configuredProvider();
    if (config && states.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(state)) {
      const binding = readBinding(request, state);
      if (binding) {
        const attempt = singleAttempt(
          await callInteracBridge("claim", {
            p_state_hash: digest(state),
            p_browser_hash: digest(binding),
          }),
        );
        if (attempt) {
          // Only the original browser can consume this one-use transaction.
          // No identity returned by the browser selects the target account.
          headers.set("Set-Cookie", cookie("", 0));
          const codes = params.getAll("code");
          let verified = false;
          if (!params.has("error") && codes.length === 1 && codes[0].length <= 4096 && codes[0]) {
            try {
              await verifyInteracCallback(
                config,
                {
                  state,
                  nonce: attempt.nonce,
                  verifier: attempt.verifier,
                },
                codes[0],
              );
              verified = true;
            } catch {
              // Provider rejection consumes the transaction and permits a new test.
            }
          }
          await callInteracBridge("finish", {
            p_attempt_id: attempt.attempt_id,
            p_outcome: verified ? "verified" : "failed",
          });
        }
      }
    }
  } catch {
    // The status RPC is authoritative. An interrupted claim expires for retry.
  }
  return new Response(null, { status: 303, headers });
}
