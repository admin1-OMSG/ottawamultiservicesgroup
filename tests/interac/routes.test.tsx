// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  interacCallback,
  interacStart,
  interacStatus,
} from "../../src/features/interac/server/routes.server";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  select: vi.fn(),
  match: vi.fn(),
  one: vi.fn(),
  rpc: vi.fn(),
  config: vi.fn(),
  authorization: vi.fn(),
  verify: vi.fn(),
  bridge: vi.fn(),
  state: "s".repeat(43),
  nonce: "n".repeat(43),
  verifier: "v".repeat(60),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: m.getUser },
    rpc: m.rpc,
    from: m.select,
  }),
}));
vi.mock("../../src/features/interac/server/bridge.server", () => ({
  callInteracBridge: m.bridge,
  InteracBridgeError: class extends Error {},
}));
vi.mock("../../src/features/interac/server/protocol.server", () => ({
  getInteracConfig: m.config,
  createInteracFlow: () => ({ state: m.state, nonce: m.nonce, verifier: m.verifier }),
  getAuthorizationUrl: m.authorization,
  verifyInteracCallback: m.verify,
}));

const site = "https://ottawamultiservicesgroup-git-codex-professional-onboarding-omsg.vercel.app";
const database = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const authorized = { Authorization: "Bearer test-session" };
const target = "https://gateway-portal.hub-verify.innovation.interac.ca/auth?example=test";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const userId = "7c8ec497-b6b1-448a-9309-3121665c2caf";
function start(origin = site, consent = true) {
  return interacStart(
    new Request(site + "/api/interac/start", {
      method: "POST",
      headers: { ...authorized, Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "fr-CA", consent }),
    }),
  );
}
function callback(query: string, cookie: string) {
  return interacCallback(
    new Request(site + "/api/interac/callback?" + query, { headers: { Cookie: cookie } }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VITE_SUPABASE_URL", database);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-test");
  vi.stubEnv("VITE_INTERAC_SANDBOX_ENABLED", "true");
  m.getUser.mockResolvedValue({ data: { user: { id: userId, email_confirmed_at: "2026-11-01" } } });
  m.one.mockResolvedValue({ data: { review_status: "approved" } });
  m.match.mockReturnValue({ maybeSingle: m.one });
  m.select.mockReturnValue({ select: () => ({ eq: m.match }) });
  m.rpc.mockResolvedValue({ data: [{ status: "not_started" }] });
  m.config.mockReturnValue({ redirectUri: site + "/api/interac/callback" });
  m.authorization.mockResolvedValue(target);
});
afterEach(() => vi.unstubAllEnvs());

describe("OMSG sandbox routes", () => {
  it("reads only the signed-in user's status; an approved dossier does not imply Interac approval", async () => {
    m.config.mockReturnValue(null);
    const res = await interacStatus(
      new Request(site + "/api/interac/status", { headers: authorized }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false, status: "not_started" });
    expect(m.getUser).toHaveBeenCalledWith("test-session");
    expect(m.match).toHaveBeenCalledWith("user_id", userId);
    expect(m.rpc).toHaveBeenCalledWith("get_my_interac_sandbox_status");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("reports a completed sandbox check explicitly as a sandbox result", async () => {
    m.rpc.mockResolvedValue({ data: [{ status: "verified" }] });
    const res = await interacStatus(
      new Request(site + "/api/interac/status", { headers: authorized }),
    );
    expect(await res.json()).toEqual({ available: true, status: "sandbox_verified" });
  });

  it("refuses missing bearer, unsaved profile, foreign origin, and unchecked consent", async () => {
    const req = new Request(site + "/api/interac/status");
    expect((await interacStatus(req)).status).toBe(401);
    expect((await start("https://other.example")).status).toBe(403);
    expect((await start(site, false)).status).toBe(400);
    m.one.mockResolvedValue({ data: null });
    expect((await start()).status).toBe(403);
    expect(m.bridge).not.toHaveBeenCalled();
    expect(m.authorization).not.toHaveBeenCalled();
  });

  it("refuses production and wrong database/alias before contacting Auth", async () => {
    const req = new Request(site + "/api/interac/status", { headers: authorized });
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await interacStatus(req)).status).toBe(404);
    const blocked = await callback("", "");
    expect(blocked.status).toBe(404);
    expect(blocked.headers.get("Location")).toBeNull();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VITE_SUPABASE_URL", "https://other.supabase.co");
    expect((await interacStatus(req)).status).toBe(404);
    vi.stubEnv("VITE_SUPABASE_URL", database);
    expect(
      (
        await interacStatus(
          new Request("https://other.example/api/interac/status", { headers: authorized }),
        )
      ).status,
    ).toBe(404);
    expect(m.getUser).not.toHaveBeenCalled();
    expect(m.bridge).not.toHaveBeenCalled();
  });

  it("binds the provider return to the same browser and consumes the attempt before recording a success", async () => {
    const res = await start();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: target });
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("Path=/api/interac/callback; HttpOnly; Secure; SameSite=Lax;");
    const cookie = setCookie.split(";")[0];
    const browserBinding = cookie.split(".")[1];
    expect(m.bridge).toHaveBeenCalledWith("start", {
      p_user_id: userId,
      p_state_hash: hash(m.state),
      p_browser_hash: hash(browserBinding),
      p_nonce: m.nonce,
      p_verifier: m.verifier,
    });
    expect(m.authorization).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ state: m.state }),
      "fr",
    );
    const query = "state=" + m.state + "&code=test-return-code";
    const missingCookie = await callback(query, "");
    expect(missingCookie.status).toBe(303);
    expect(m.bridge.mock.calls.map((c) => c[0])).toEqual(["start"]);

    m.bridge.mockResolvedValueOnce([
      { attempt_id: "attempt", user_id: userId, nonce: m.nonce, verifier: m.verifier },
    ]);
    const verified = await callback(query, cookie);
    expect(verified.status).toBe(303);
    expect(verified.headers.get("location")).toBe(site + "/pro");
    expect(verified.headers.get("referrer-policy")).toBe("no-referrer");
    expect(verified.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(m.verify).toHaveBeenCalledWith(
      expect.anything(),
      { state: m.state, nonce: m.nonce, verifier: m.verifier },
      "test-return-code",
    );
    expect(m.bridge.mock.calls.slice(1)).toEqual([
      ["claim", { p_state_hash: hash(m.state), p_browser_hash: hash(browserBinding) }],
      ["finish", { p_attempt_id: "attempt", p_outcome: "verified" }],
    ]);

    m.bridge.mockResolvedValueOnce([]);
    await callback(query, cookie);
    expect(m.verify).toHaveBeenCalledTimes(1);
    expect(m.bridge.mock.calls.map((c) => c[0])).toEqual(["start", "claim", "finish", "claim"]);
  });

  it("consumes provider cancellation or failed proof without allowing a verified outcome", async () => {
    const cookie = "__Secure-omsg-interac=" + m.state + "." + "b".repeat(43);
    const attempt = [
      { attempt_id: "attempt", user_id: userId, nonce: m.nonce, verifier: m.verifier },
    ];
    m.bridge.mockResolvedValueOnce(attempt);
    const cancelled = await callback("state=" + m.state + "&error=access_denied", cookie);
    expect(cancelled.headers.get("location")).toBe(site + "/pro");
    expect(m.verify).not.toHaveBeenCalled();
    expect(m.bridge).toHaveBeenLastCalledWith("finish", {
      p_attempt_id: "attempt",
      p_outcome: "failed",
    });

    m.bridge.mockResolvedValueOnce(attempt);
    m.verify.mockRejectedValueOnce(
      new Error("upstream personal data must never reach the browser"),
    );
    const declined = await callback("state=" + m.state + "&code=bad", cookie);
    expect(await declined.text()).toBe("");
    expect(m.bridge).toHaveBeenLastCalledWith("finish", {
      p_attempt_id: "attempt",
      p_outcome: "failed",
    });
  });
});
