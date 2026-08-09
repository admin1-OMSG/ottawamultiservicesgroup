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
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase function secrets are incomplete." }, 500)
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
    const estimateId = String(body?.estimateId ?? "")
    const signerName = String(body?.signerName ?? "").trim()
    const signatureDataUrl = String(body?.signatureDataUrl ?? "")
    const consentAccepted = body?.consentAccepted === true
    const bookingStartsAt = String(body?.bookingStartsAt ?? "")

    if (!estimateId) return json({ error: "Estimate ID is required." }, 400)
    if (!bookingStartsAt || Number.isNaN(Date.parse(bookingStartsAt))) return json({ error: "A valid appointment slot is required before signing." }, 400)
    if (signerName.length < 2 || signerName.length > 160) return json({ error: "Enter the signer’s full name." }, 400)
    if (!consentAccepted) return json({ error: "Consent must be accepted." }, 400)
    if (!signatureDataUrl.startsWith("data:image/png;base64,") || signatureDataUrl.length > 500_000) {
      return json({ error: "The signature image is invalid or too large." }, 400)
    }

    const { data: account, error: accountError } = await adminClient
      .from("customer_accounts")
      .select("customer_id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle()
    if (accountError || !account) return json({ error: "No customer record is linked to this account." }, 403)

    const { data: estimate, error: estimateError } = await adminClient
      .from("estimates")
      .select("id,customer_id,status,estimate_number")
      .eq("id", estimateId)
      .eq("customer_id", account.customer_id)
      .maybeSingle()
    if (estimateError || !estimate) return json({ error: "Estimate not found." }, 404)
    if (!["sent", "viewed", "pending_review"].includes(estimate.status)) {
      return json({ error: "This estimate can no longer be signed." }, 409)
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const connecting = req.headers.get("cf-connecting-ip")?.trim()
    const ipAddress = connecting || forwarded || null
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null
    const consentText = "I confirm that I reviewed this estimate, including the estimated service duration, selected the appointment shown before signing, and accept its services, prices, notes and terms. By signing this estimate, I confirm the selected appointment and commit to having the service performed and to paying the invoice according to the accepted estimate and any additional work I expressly authorize."

    const { data: result, error: acceptError } = await userClient.rpc("customer_accept_estimate_with_booking", {
      p_estimate_id: estimate.id,
      p_starts_at: bookingStartsAt,
      p_signer_name: signerName,
      p_signature_data_url: signatureDataUrl,
      p_consent_text: consentText,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (acceptError) {
      const message = acceptError.message || "Could not accept estimate and reserve appointment."
      if (/already been signed/i.test(message)) return json({ error: "This estimate has already been signed." }, 409)
      if (/no longer available|blocked|outside business hours|not available/i.test(message)) return json({ error: message }, 409)
      if (/not linked|not found|not available for acceptance/i.test(message)) return json({ error: message }, 403)
      throw acceptError
    }

    return json({ ok: true, ...(result ?? {}) })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500)
  }
})
