import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
    const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "")

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey || !siteUrl) {
      return json({ error: "Required function secrets are incomplete." }, 500)
    }

    const authorization = req.headers.get("Authorization") ?? ""
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: "Invalid session." }, 401)

    const body = await req.json()
    const invoiceId = String(body?.invoiceId ?? "")
    const paymentType = body?.paymentType === "deposit" ? "deposit" : "full"
    if (!invoiceId) return json({ error: "Invoice ID is required." }, 400)

    const { data: account, error: accountError } = await adminClient
      .from("customer_accounts")
      .select("customer_id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle()
    if (accountError || !account) return json({ error: "No customer record is linked to this account." }, 403)

    const { data: invoice, error: invoiceError } = await adminClient
      .from("invoices")
      .select("id,invoice_number,title,status,total,balance_due,currency,customer:customers(first_name,last_name,email)")
      .eq("id", invoiceId)
      .eq("customer_id", account.customer_id)
      .maybeSingle()

    if (invoiceError || !invoice) return json({ error: "Invoice not found." }, 404)
    if (["draft", "paid", "void"].includes(invoice.status) || Number(invoice.balance_due) <= 0) {
      return json({ error: "This invoice is not available for online payment." }, 409)
    }

    const balanceCents = Math.round(Number(invoice.balance_due) * 100)
    const amountCents = paymentType === "deposit"
      ? Math.min(balanceCents, Math.max(50, Math.round(balanceCents * 0.30)))
      : balanceCents
    const amount = amountCents / 100
    const customer = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer

    const { data: checkoutRow, error: checkoutInsertError } = await adminClient
      .from("stripe_checkout_sessions")
      .insert({
        invoice_id: invoice.id,
        customer_id: account.customer_id,
        payment_type: paymentType,
        amount,
        currency: String(invoice.currency ?? "CAD").toUpperCase(),
        status: "creating",
        created_by: userData.user.id,
      })
      .select("id")
      .single()
    if (checkoutInsertError) throw checkoutInsertError

    const description = paymentType === "deposit"
      ? `Acompte de 30 % — facture ${invoice.invoice_number}`
      : `Paiement de la facture ${invoice.invoice_number}`

    const form = new URLSearchParams()
    form.set("mode", "payment")
    form.set("success_url", `${siteUrl}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`)
    form.set("cancel_url", `${siteUrl}/portal?payment=cancelled`)
    form.set("client_reference_id", invoice.id)
    form.set("line_items[0][price_data][currency]", String(invoice.currency ?? "CAD").toLowerCase())
    form.set("line_items[0][price_data][product_data][name]", description)
    form.set("line_items[0][price_data][product_data][description]", invoice.title || "Ottawa Multiservices Group")
    form.set("line_items[0][price_data][unit_amount]", String(amountCents))
    form.set("line_items[0][quantity]", "1")
    form.set("metadata[checkout_record_id]", checkoutRow.id)
    form.set("metadata[invoice_id]", invoice.id)
    form.set("metadata[customer_id]", account.customer_id)
    form.set("metadata[payment_type]", paymentType)
    if (customer?.email) form.set("customer_email", customer.email)

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": checkoutRow.id,
      },
      body: form,
    })
    const stripeSession = await stripeResponse.json()

    if (!stripeResponse.ok || !stripeSession?.id || !stripeSession?.url) {
      await adminClient.from("stripe_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", checkoutRow.id)
      return json({ error: stripeSession?.error?.message ?? "Stripe could not create the payment page." }, 502)
    }

    const { error: updateError } = await adminClient
      .from("stripe_checkout_sessions")
      .update({
        stripe_session_id: stripeSession.id,
        checkout_url: stripeSession.url,
        status: "open",
        expires_at: stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutRow.id)
    if (updateError) throw updateError

    return json({ ok: true, url: stripeSession.url, sessionId: stripeSession.id, amount })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500)
  }
})
