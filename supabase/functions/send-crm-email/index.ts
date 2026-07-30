import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const resendApiKey = Deno.env.get("RESEND_API_KEY")!
const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL")!
const fromEmail = Deno.env.get("EMAIL_FROM") || "Ottawa Multiservices <notifications@ottawamultiservicesgroup.com>"
const siteUrl = (Deno.env.get("SITE_URL") || "https://www.ottawamultiservicesgroup.com").replace(/\/$/, "")

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

type EventBody =
  | { type: "quote_requested"; requestId: string }
  | { type: "estimate_accepted"; estimateId: string }
  | { type: "estimate_ready"; estimateId: string }
  | { type: "appointment_proposed"; jobId: string }

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value || 0))
}

function dateTime(value: string | null) {
  if (!value) return "Date à confirmer"
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Toronto",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value))
}

function layout(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:640px;margin:0 auto;padding:32px 16px"><div style="background:#020617;color:white;padding:22px 26px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;color:#34d399">OTTAWA MULTISERVICES</div><h1 style="font-size:24px;margin:8px 0 0">${escapeHtml(title)}</h1></div><div style="background:white;padding:28px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px">${content}<p style="margin-top:28px;font-size:12px;color:#64748b">Ottawa Multiservices Group Inc.<br>${escapeHtml(siteUrl)}</p></div></div></body></html>`
}

async function currentUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return null
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
  const { data } = await authClient.auth.getUser(token)
  return data.user ?? null
}

async function isAdmin(userId: string | undefined) {
  if (!userId) return false
  const { data } = await admin.from("admin_users").select("id").eq("id", userId).eq("is_active", true).maybeSingle()
  return Boolean(data)
}

async function linkedCustomerId(userId: string | undefined) {
  if (!userId) return null
  const { data } = await admin.from("customer_accounts").select("customer_id").eq("auth_user_id", userId).maybeSingle()
  return data?.customer_id ?? null
}

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html, reply_to: replyTo }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result?.message || "Resend rejected the email")
  return result.id as string
}

async function alreadySent(key: string) {
  const { data } = await admin.from("email_notifications").select("id").eq("idempotency_key", key).maybeSingle()
  return Boolean(data)
}

async function logEmail(values: Record<string, unknown>) {
  await admin.from("email_notifications").insert(values)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    if (!resendApiKey || !adminEmail) throw new Error("Email secrets are not configured")
    const body = (await req.json()) as EventBody
    const user = await currentUser(req)

    let recipient = ""
    let subject = ""
    let html = ""
    let key = ""
    let recordId = ""
    let recipientType = "customer"
    let replyTo: string | undefined

    if (body.type === "quote_requested") {
      const { data: request } = await admin.from("service_requests").select("id,first_name,last_name,email,phone,address_line,service_name,description,created_at").eq("id", body.requestId).maybeSingle()
      if (!request) throw new Error("Quote request not found")
      const age = Date.now() - new Date(request.created_at).getTime()
      if (age > 30 * 60 * 1000) throw new Error("Quote request notification expired")
      key = `quote-requested:${request.id}`
      recordId = request.id
      recipient = adminEmail
      recipientType = "admin"
      replyTo = request.email
      subject = `Nouvelle demande de devis — ${request.service_name || "Service"}`
      html = layout("Nouvelle demande de devis", `<p>Une nouvelle demande vient d’être envoyée depuis le site.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:7px 0;color:#64748b">Client</td><td style="padding:7px 0;font-weight:700">${escapeHtml(`${request.first_name} ${request.last_name || ""}`)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Service</td><td style="padding:7px 0">${escapeHtml(request.service_name)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Courriel</td><td style="padding:7px 0">${escapeHtml(request.email)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Téléphone</td><td style="padding:7px 0">${escapeHtml(request.phone)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Adresse</td><td style="padding:7px 0">${escapeHtml(request.address_line)}</td></tr></table><p><a href="${siteUrl}/admin/quotes/${request.id}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Ouvrir la demande</a></p>`)
    } else if (body.type === "estimate_accepted") {
      const customerId = await linkedCustomerId(user?.id)
      const { data: estimate } = await admin.from("estimates").select("id,estimate_number,title,total,status,customer_id,customer:customers(first_name,last_name,email)").eq("id", body.estimateId).maybeSingle()
      if (!estimate || !customerId || estimate.customer_id !== customerId || estimate.status !== "accepted") throw new Error("Not authorized")
      const customer = Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer
      key = `estimate-accepted:${estimate.id}`
      recordId = estimate.id
      recipient = adminEmail
      recipientType = "admin"
      replyTo = customer?.email
      subject = `Devis accepté — ${estimate.estimate_number}`
      html = layout("Un client a accepté son devis", `<p><strong>${escapeHtml(`${customer?.first_name || ""} ${customer?.last_name || ""}`)}</strong> a accepté le devis <strong>${escapeHtml(estimate.estimate_number)}</strong>.</p><p>Montant : <strong>${money(estimate.total)}</strong></p><p><a href="${siteUrl}/admin/estimates/${estimate.id}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Ouvrir le devis</a></p>`)
    } else if (body.type === "estimate_ready") {
      if (!(await isAdmin(user?.id))) throw new Error("Admin access required")
      const { data: estimate } = await admin.from("estimates").select("id,estimate_number,title,total,status,updated_at,customer:customers(first_name,last_name,email)").eq("id", body.estimateId).maybeSingle()
      if (!estimate || !["sent", "viewed"].includes(estimate.status)) throw new Error("Estimate is not ready to send")
      const customer = Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer
      if (!customer?.email) throw new Error("Customer email missing")
      key = `estimate-ready:${estimate.id}:${estimate.updated_at}`
      recordId = estimate.id
      recipient = customer.email
      subject = `Votre devis ${estimate.estimate_number} est prêt`
      html = layout("Votre devis est prêt", `<p>Bonjour ${escapeHtml(customer.first_name)},</p><p>Nous avons préparé votre devis <strong>${escapeHtml(estimate.estimate_number)}</strong> pour ${escapeHtml(estimate.title || "le service demandé")}.</p><p>Montant : <strong>${money(estimate.total)}</strong></p><p>Vous pouvez le consulter, l’accepter ou le refuser dans votre espace client.</p><p><a href="${siteUrl}/portal" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Consulter mon devis</a></p>`)
    } else if (body.type === "appointment_proposed") {
      if (!(await isAdmin(user?.id))) throw new Error("Admin access required")
      const { data: job } = await admin.from("jobs").select("id,job_number,title,status,scheduled_start,scheduled_end,address_line,city,customer:customers(first_name,last_name,email)").eq("id", body.jobId).maybeSingle()
      if (!job || !job.scheduled_start) throw new Error("Appointment date missing")
      const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
      if (!customer?.email) throw new Error("Customer email missing")
      key = `appointment:${job.id}:${job.scheduled_start}`
      recordId = job.id
      recipient = customer.email
      subject = `Proposition de rendez-vous — ${job.title}`
      html = layout("Proposition de rendez-vous", `<p>Bonjour ${escapeHtml(customer.first_name)},</p><p>Nous vous proposons le rendez-vous suivant pour <strong>${escapeHtml(job.title)}</strong> :</p><div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:18px 0"><div style="font-size:18px;font-weight:700">${escapeHtml(dateTime(job.scheduled_start))}</div>${job.scheduled_end ? `<div style="margin-top:5px;color:#475569">Fin prévue : ${escapeHtml(dateTime(job.scheduled_end))}</div>` : ""}<div style="margin-top:5px;color:#475569">${escapeHtml([job.address_line, job.city].filter(Boolean).join(", "))}</div></div><p>Consultez votre espace client pour retrouver les détails de l’intervention.</p><p><a href="${siteUrl}/portal" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Voir mon rendez-vous</a></p>`)
    } else {
      throw new Error("Unsupported event")
    }

    if (await alreadySent(key)) return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

    const providerId = await sendEmail(recipient, subject, html, replyTo)
    await logEmail({
      event_type: body.type,
      record_id: recordId,
      recipient_email: recipient,
      recipient_type: recipientType,
      subject,
      provider_message_id: providerId,
      status: "sent",
      idempotency_key: key,
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
