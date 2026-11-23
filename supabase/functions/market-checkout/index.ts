import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const previewProject = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const previewOrigin =
  "https://ottawamultiservicesgroup-git-codex-professional-onboarding-omsg.vercel.app";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const dbUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: "authentication_required" }, 401);
  if (!dbUrl || !anon || !serviceKey) return json({ error: "billing_unavailable" }, 503);
  const auth = createClient(dbUrl, anon, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return json({ error: "invalid_session" }, 401);
  const admin = createClient(dbUrl, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "invalid_request" }, 400);
  const isPreview = dbUrl === previewProject;
  const origin = isPreview ? previewOrigin : Deno.env.get("MARKET_SITE_ORIGIN");
  if (!origin || !/^https:\/\/[^/?#]+$/.test(origin))
    return json({ error: "billing_unavailable" }, 503);
  const key = Deno.env.get("MARKET_STRIPE_SECRET_KEY") ?? "";
  // Live billing requires an independent operator opt-in and can never run on the preview branch.
  const live = !isPreview && Deno.env.get("MARKET_BILLING_MODE") === "live";
  const stripe = key.startsWith(live ? "sk_live_" : "sk_test_")
    ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
    : null;
  if (body.action === "manage") {
    if (!stripe) return json({ error: "billing_unavailable" }, 503);
    const { data: customer, error } = await admin.rpc("market_checkout_customer", {
      p_user_id: data.user.id,
    });
    if (error || !customer) return json({ error: "no_subscription" }, 409);
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: origin + "/pro-market",
      });
      return json({ url: portal.url });
    } catch {
      return json({ error: "portal_unavailable" }, 503);
    }
  }
  if (
    !uuid.test(String(body.attempt_id)) ||
    !["pack52", "pack104", "pack208", "monthly"].includes(body.offer_code) ||
    (body.return_request_id != null && !uuid.test(String(body.return_request_id)))
  ) {
    return json({ error: "invalid_order" }, 400);
  }
  const { data: order, error: orderError } = await admin.rpc("market_checkout_begin", {
    p_user_id: data.user.id,
    p_code: body.offer_code,
    p_attempt: body.attempt_id,
    p_lead: body.return_request_id ?? null,
  });
  if (orderError || !order) {
    const known = [
      "approved_provider_required",
      "offer_unavailable",
      "checkout_expired",
      "subscription_exists",
      "attempt_conflict",
    ];
    return json(
      {
        error: known.includes(orderError?.message ?? "")
          ? orderError!.message
          : "checkout_unavailable",
      },
      409,
    );
  }
  const back = (result: string) => {
    const params = new URLSearchParams({ checkout: result });
    if (order.return_request_id) params.set("lead", order.return_request_id);
    return "/pro-market?" + params.toString();
  };
  if (order.preview_checkout_enabled && !isPreview)
    return json({ error: "simulation_unavailable" }, 409);
  if (order.preview_checkout_enabled && order.kind === "pack") {
    const { error } = await admin.rpc("market_checkout_simulate", { p_order_id: order.id });
    return error
      ? json({ error: "simulation_unavailable" }, 409)
      : json({ url: back("simulated") });
  }
  if (!stripe) return json({ error: "billing_unavailable" }, 503);
  if (order.paid_at) return json({ url: back("success") });
  const metadata = { omsg_market: "v1", order_id: order.id };
  try {
    if (order.stripe_session) {
      const old = await stripe.checkout.sessions.retrieve(order.stripe_session);
      if (old.status === "open" && old.url) return json({ url: old.url });
      if (old.status === "complete") return json({ url: back("success") });
      if (old.status === "expired") {
        const result = await admin.rpc("market_checkout_link", {
          p_order_id: order.id,
          p_session: old.id,
          p_expired: true,
        });
        if (result.error) return json({ error: "checkout_unavailable" }, 503);
      }
      return json({ error: "checkout_expired" }, 409);
    }
    const subscription = order.kind === "subscription";
    const session = await stripe.checkout.sessions.create(
      {
        mode: subscription ? "subscription" : "payment",
        customer_email: order.email,
        metadata,
        payment_method_types: ["card"],
        success_url: origin + back("success"),
        cancel_url: origin + back("cancel"),
        expires_at: Math.floor(new Date(order.expires_at).getTime() / 1000),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "cad",
              unit_amount: order.price_cents,
              product_data: { name: order.name },
              ...(subscription ? { recurring: { interval: "month" as const } } : {}),
            },
          },
        ],
        ...(subscription ? { subscription_data: { metadata } } : {}),
      },
      { idempotencyKey: "omsg-market:" + order.id },
    );
    const linked = await admin.rpc("market_checkout_link", {
      p_order_id: order.id,
      p_session: session.id,
      p_expired: false,
    });
    if (linked.error || !session.url) return json({ error: "checkout_unavailable" }, 503);
    return json({ url: session.url });
  } catch {
    return json({ error: "checkout_unavailable" }, 503);
  }
});
