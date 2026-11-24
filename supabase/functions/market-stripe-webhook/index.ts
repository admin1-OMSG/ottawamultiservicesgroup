import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const previewProject = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id;
const isMarket = (metadata: Stripe.Metadata | null) =>
  metadata?.omsg_market === "v1" && !!metadata.order_id;

async function paidSubscriptionPeriod(stripe: Stripe, invoiceId: string, subscription: Stripe.Subscription) {
  // Fetch every line in the SDK's API version. A webhook snapshot can be truncated
  // or use an older API version, and a late invoice covers its original period.
  let period: Stripe.InvoiceLineItem.Period | undefined;
  for await (const line of stripe.invoices.listLineItems(invoiceId, { limit: 100 })) {
    const item = line.parent?.subscription_item_details;
    if (!item || item.proration || line.amount <= 0) continue;
    const matches = item.subscription
      ? item.subscription === subscription.id
      : subscription.items.data.some(entry => entry.id === item.subscription_item);
    if (!matches) continue;
    if (period || !Number.isSafeInteger(line.period.start) || !Number.isSafeInteger(line.period.end) ||
      line.period.end <= line.period.start) throw new Error("invalid_subscription_period");
    period = line.period;
  }
  if (!period) throw new Error("missing_subscription_period");
  return { p_period_start: period.start, p_period_end: period.end };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const dbUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const key = Deno.env.get("MARKET_STRIPE_SECRET_KEY") ?? "";
  const secret = Deno.env.get("MARKET_STRIPE_WEBHOOK_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const live = dbUrl !== previewProject && Deno.env.get("MARKET_BILLING_MODE") === "live";
  if (!secret || !dbUrl || !serviceKey || !key.startsWith(live ? "sk_live_" : "sk_test_")) {
    return new Response("Billing unavailable", { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      300,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.livemode !== live) return new Response("Wrong mode", { status: 400 });
  const admin = createClient(dbUrl, serviceKey, { auth: { persistSession: false } });
  async function record(name: string, args: Record<string, unknown>) {
    const { error } = await admin.rpc(name, args);
    if (error) throw new Error("database_write_failed");
  }
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded" ||
      event.type === "checkout.session.expired"
    ) {
      const s = event.data.object;
      if (isMarket(s.metadata)) {
        if (event.type === "checkout.session.expired" || s.mode === "subscription") {
          await record("market_checkout_link", {
            p_order_id: s.metadata!.order_id,
            p_session: s.id,
            p_expired: event.type === "checkout.session.expired",
          });
        } else if (s.mode === "payment" && s.payment_status === "paid") {
          await record("market_payment_credit", {
            p_order_id: s.metadata!.order_id,
            p_object: s.id,
            p_amount: s.amount_total,
            p_currency: s.currency,
            p_customer: idOf(s.customer) ?? null,
            p_subscription: null,
          });
        }
      }
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const legacyInvoice = invoice as typeof invoice & {
        subscription?: string | { id: string } | null;
      };
      const subId = idOf(
        invoice.parent?.subscription_details?.subscription ?? legacyInvoice.subscription,
      );
      if (
        subId &&
        invoice.status === "paid" &&
        invoice.amount_paid > 0 &&
        invoice.amount_remaining === 0 &&
        ["subscription_create", "subscription_cycle"].includes(invoice.billing_reason ?? "")
      ) {
        const sub = await stripe.subscriptions.retrieve(subId);
        if (isMarket(sub.metadata)) {
          if (!invoice.id) throw new Error("missing_paid_invoice_id");
          const period = sub.metadata.offer_code === "monthly208"
            ? await paidSubscriptionPeriod(stripe, invoice.id, sub)
            : {};
          await record("market_payment_credit", {
            p_order_id: sub.metadata.order_id,
            p_object: invoice.id,
            p_amount: invoice.amount_paid,
            p_currency: invoice.currency,
            p_customer: idOf(invoice.customer),
            p_subscription: sub.id,
            ...period,
          });
        }
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused" ||
      event.type === "customer.subscription.resumed"
    ) {
      const supplied = event.data.object;
      if (isMarket(supplied.metadata)) {
        // Stripe can deliver events out of order. Read the current subscription state.
        const sub = await stripe.subscriptions.retrieve(supplied.id);
        await record("market_subscription_state", {
          p_order_id: supplied.metadata.order_id,
          p_subscription: sub.id,
          p_customer: idOf(sub.customer),
          p_status: sub.status,
          p_time: event.created,
        });
      }
    }
    return Response.json({ received: true });
  } catch {
    // Stripe retries. No request body, account data or API credentials enter logs.
    console.error("Marketplace billing delivery failed", event.id);
    return new Response("Delivery pending", { status: 500 });
  }
});
