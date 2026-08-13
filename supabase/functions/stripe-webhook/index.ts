import Stripe from "npm:stripe@18.5.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const stripe = new Stripe(stripeSecretKey, {
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response("Webhook secrets are incomplete", { status: 500 })
  }

  const signature = req.headers.get("Stripe-Signature")
  if (!signature) return new Response("Missing Stripe-Signature", { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error("Stripe signature verification failed", error)
    return new Response("Invalid signature", { status: 400 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status === "paid") {
        const amount = Number(session.amount_total ?? 0) / 100
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
        const { error } = await adminClient.rpc("record_stripe_checkout_payment", {
          p_stripe_session_id: session.id,
          p_payment_intent_id: paymentIntentId,
          p_amount: amount,
          p_paid_at: new Date(event.created * 1000).toISOString(),
        })
        if (error) throw error
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session
      const { error } = await adminClient
        .from("stripe_checkout_sessions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("stripe_session_id", session.id)
        .neq("status", "complete")
      if (error) throw error
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session
      const { error } = await adminClient
        .from("stripe_checkout_sessions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("stripe_session_id", session.id)
        .neq("status", "complete")
      if (error) throw error
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, error)
    return new Response("Webhook processing failed", { status: 500 })
  }
})
