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
const businessAddress = Deno.env.get("BUSINESS_ADDRESS") || "Ottawa, Ontario, Canada"
const businessPhone = Deno.env.get("BUSINESS_PHONE") || "(613) 407-6699"
const gstHstNumber = Deno.env.get("GST_HST_NUMBER") || ""

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

type EventBody =
  | { type: "quote_requested"; requestId: string }
  | { type: "estimate_accepted"; estimateId: string }
  | { type: "estimate_ready"; estimateId: string }
  | { type: "appointment_proposed"; jobId: string }
  | { type: "booking_confirmed"; bookingId: string }
  | { type: "invoice_ready"; invoiceId: string }

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
  if (!value) return "Date to be confirmed"
  return new Intl.DateTimeFormat("en-CA", {
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

function formatQuestionnaire(value: unknown) {
  if (!value || typeof value !== "object") return ""
  const entries = Object.entries(value as Record<string, unknown>)
  if (!entries.length) return ""
  const rows = entries.map(([key, raw]) => {
    const label = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())
    const rendered = Array.isArray(raw) ? raw.join(", ") : typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw ?? "")
    return `<tr><td style="padding:7px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0">${escapeHtml(rendered)}</td></tr>`
  }).join("")
  return `<h3 style="margin-top:24px">Questionnaire</h3><table style="width:100%;border-collapse:collapse">${rows}</table>`
}

async function createDirectPortalLink(email: string, estimateId: string) {
  const redirectTo = `${siteUrl}/portal?estimate=${encodeURIComponent(estimateId)}`
  const magic = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } })
  if (!magic.error && magic.data?.properties?.action_link) return magic.data.properties.action_link
  const signup = await admin.auth.admin.generateLink({ type: "signup", email, password: crypto.randomUUID(), options: { redirectTo } })
  if (!signup.error && signup.data?.properties?.action_link) return signup.data.properties.action_link
  console.warn("Direct portal link could not be generated", magic.error ?? signup.error)
  return `${siteUrl}/portal?estimate=${encodeURIComponent(estimateId)}`
}

async function createDirectInvoiceLink(email: string, invoiceId: string) {
  const redirectTo = `${siteUrl}/portal?invoice=${encodeURIComponent(invoiceId)}`
  const magic = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } })
  if (!magic.error && magic.data?.properties?.action_link) return magic.data.properties.action_link
  const signup = await admin.auth.admin.generateLink({ type: "signup", email, password: crypto.randomUUID(), options: { redirectTo } })
  if (!signup.error && signup.data?.properties?.action_link) return signup.data.properties.action_link
  console.warn("Direct invoice portal link could not be generated", magic.error ?? signup.error)
  return `${siteUrl}/portal?invoice=${encodeURIComponent(invoiceId)}`
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
      const { data: request } = await admin.from("service_requests").select("id,first_name,last_name,email,phone,address_line,service_name,description,questionnaire_answers,created_at").eq("id", body.requestId).maybeSingle()
      if (!request) throw new Error("Quote request not found")
      const age = Date.now() - new Date(request.created_at).getTime()
      if (age > 30 * 60 * 1000) throw new Error("Quote request notification expired")
      key = `quote-requested:${request.id}`
      recordId = request.id
      recipient = adminEmail
      recipientType = "admin"
      replyTo = request.email
      subject = `New quote request — ${request.service_name || "Service"}`
      html = layout("New Quote Request", `<p>A new quote request was submitted from the website.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:7px 0;color:#64748b">Customer</td><td style="padding:7px 0;font-weight:700">${escapeHtml(`${request.first_name} ${request.last_name || ""}`)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Service</td><td style="padding:7px 0">${escapeHtml(request.service_name)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Email</td><td style="padding:7px 0">${escapeHtml(request.email)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Phone</td><td style="padding:7px 0">${escapeHtml(request.phone)}</td></tr><tr><td style="padding:7px 0;color:#64748b">Address</td><td style="padding:7px 0">${escapeHtml(request.address_line)}</td></tr></table>${formatQuestionnaire(request.questionnaire_answers)}<p><a href="${siteUrl}/admin/quotes/${request.id}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Request</a></p>`)
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
      subject = `Quote accepted — ${estimate.estimate_number}`
      html = layout("A customer accepted a quote", `<p><strong>${escapeHtml(`${customer?.first_name || ""} ${customer?.last_name || ""}`)}</strong> accepted quote <strong>${escapeHtml(estimate.estimate_number)}</strong>.</p><p>Amount: <strong>${money(estimate.total)}</strong></p><p><a href="${siteUrl}/admin/estimates/${estimate.id}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Quote</a></p>`)
    } else if (body.type === "estimate_ready") {
      if (!(await isAdmin(user?.id))) throw new Error("Admin access required")
      const { data: estimate } = await admin.from("estimates").select("id,estimate_number,title,total,status,updated_at,estimated_duration_minutes,crew_size,customer:customers(first_name,last_name,email)").eq("id", body.estimateId).maybeSingle()
      if (!estimate || !["sent", "viewed"].includes(estimate.status)) throw new Error("Estimate is not ready to send")
      const customer = Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer
      if (!customer?.email) throw new Error("Customer email missing")
      key = `estimate-ready:${estimate.id}:${estimate.updated_at}`
      recordId = estimate.id
      recipient = customer.email
      subject = `Your quote ${estimate.estimate_number} is ready`
      const portalLink = await createDirectPortalLink(customer.email, estimate.id)
      const duration = Number(estimate.estimated_duration_minutes || 0)
      const durationText = duration ? `${(duration / 60).toFixed(duration % 60 === 0 ? 0 : 1)} on-site hour(s) · crew of ${estimate.crew_size || 1}` : "Duration to be confirmed"
      html = layout("Your quote is ready", `<p>Hello ${escapeHtml(customer.first_name)},</p><p>We prepared your quote <strong>${escapeHtml(estimate.estimate_number)}</strong> for ${escapeHtml(estimate.title || "the requested service")}.</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:18px 0"><p style="margin:0 0 8px">Amount: <strong>${money(estimate.total)}</strong></p><p style="margin:0">Estimated duration: <strong>${escapeHtml(durationText)}</strong></p></div><p>The button below signs you in directly and securely to your quote. You can review it, choose an available appointment, and sign it.</p><p><a href="${portalLink}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">View & Sign My Quote</a></p>`)
    } else if (body.type === "appointment_proposed") {
      if (!(await isAdmin(user?.id))) throw new Error("Admin access required")
      const { data: job } = await admin.from("jobs").select("id,job_number,title,status,scheduled_start,scheduled_end,address_line,city,customer:customers(first_name,last_name,email)").eq("id", body.jobId).maybeSingle()
      if (!job || !job.scheduled_start) throw new Error("Appointment date missing")
      const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
      if (!customer?.email) throw new Error("Customer email missing")
      key = `appointment:${job.id}:${job.scheduled_start}`
      recordId = job.id
      recipient = customer.email
      subject = `Appointment proposal — ${job.title}`
      html = layout("Appointment proposal", `<p>Hello ${escapeHtml(customer.first_name)},</p><p>We propose the following appointment for <strong>${escapeHtml(job.title)}</strong> :</p><div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:18px 0"><div style="font-size:18px;font-weight:700">${escapeHtml(dateTime(job.scheduled_start))}</div>${job.scheduled_end ? `<div style="margin-top:5px;color:#475569">Estimated end: ${escapeHtml(dateTime(job.scheduled_end))}</div>` : ""}<div style="margin-top:5px;color:#475569">${escapeHtml([job.address_line, job.city].filter(Boolean).join(", "))}</div></div><p>View your client portal for the job details.</p><p><a href="${siteUrl}/portal" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">View my appointment</a></p>`)
    } else if (body.type === "invoice_ready") {
      if (!(await isAdmin(user?.id))) throw new Error("Admin access required")
      const { data: invoice } = await admin
        .from("invoices")
        .select("id,invoice_number,title,status,issue_date,due_date,subtotal,discount_total,tax_rate,tax_total,total,amount_paid,balance_due,currency,updated_at,job_id,customer:customers(first_name,last_name,email,phone,address_line,city,province,postal_code)")
        .eq("id", body.invoiceId)
        .maybeSingle()
      if (!invoice) throw new Error("Invoice not found")
      const customer = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer
      if (!customer?.email) throw new Error("Customer email missing")
      const [{ data: items }, { data: payments }] = await Promise.all([
        admin.from("invoice_items").select("description,quantity,unit_price,line_total").eq("invoice_id", invoice.id).order("position"),
        admin.from("payments").select("amount,payment_date,method,reference").eq("invoice_id", invoice.id).order("payment_date", { ascending: false }),
      ])
      const isPaid = Number(invoice.balance_due || 0) <= 0 || invoice.status === "paid"
      key = `invoice-ready-v2:${invoice.id}:${invoice.updated_at}:${invoice.status}:${invoice.amount_paid}`
      recordId = invoice.id
      recipient = customer.email
      recipientType = "customer"
      subject = isPaid ? `Paid invoice — ${invoice.invoice_number}` : `Your invoice ${invoice.invoice_number}`
      const portalLink = await createDirectInvoiceLink(customer.email, invoice.id)
      let invoicePhotoHtml = ""
      if (invoice.job_id) {
        const { data: photoRows } = await admin.from("job_photos").select("id,storage_path,caption").eq("job_id", invoice.job_id).eq("kind", "after").order("created_at")
        const signedPhotos = await Promise.all((photoRows ?? []).slice(0, 6).map(async (photo) => {
          const { data } = await admin.storage.from("service-photos").createSignedUrl(photo.storage_path, 7 * 24 * 60 * 60)
          return data?.signedUrl ? { url: data.signedUrl, caption: photo.caption } : null
        }))
        const visiblePhotos = signedPhotos.filter(Boolean) as { url: string; caption: string | null }[]
        if (visiblePhotos.length) {
          invoicePhotoHtml = `<div style="margin:0 0 22px 0"><div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px">Completed work photos</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${visiblePhotos.map((photo, index) => `<td width="${Math.floor(100 / Math.min(visiblePhotos.length, 3))}%" valign="top" style="padding:4px"><a href="${photo.url}" style="text-decoration:none"><img src="${photo.url}" alt="${escapeHtml(photo.caption || `Photo ${index + 1}`)}" width="170" style="display:block;width:100%;max-width:170px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0"><div style="margin-top:5px;font-size:11px;color:#64748b">${escapeHtml(photo.caption || `Photo ${index + 1}`)}</div></a></td>${(index + 1) % 3 === 0 && index + 1 < visiblePhotos.length ? `</tr><tr>` : ""}`).join("")}</tr></table><div style="margin-top:8px;font-size:11px;color:#64748b">These photo links are secure and temporary. The full gallery remains available in your client portal.</div></div>`
        }
      }
      const taxRate = Number(invoice.tax_rate || 0) * 100
      const paymentLabels: Record<string, string> = { etransfer: "Interac e-Transfer", credit_card: "Credit card", debit_card: "Debit card", cash: "Cash", cheque: "Cheque", bank_transfer: "Bank transfer", other: "Other" }
      const itemRows = (items || []).map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(item.description)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:center">${escapeHtml(item.quantity)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right">${money(item.unit_price)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${money(item.line_total)}</td></tr>`).join("")
      const paymentRows = (payments || []).map((p) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(p.payment_date)}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(paymentLabels[p.method] || p.method)}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(p.reference || "—")}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${money(p.amount)}</td></tr>`).join("")
      const customerAddress = [customer.address_line, customer.city, customer.province, customer.postal_code].filter(Boolean).join(", ")
      const statusLabel = isPaid ? "PAID" : "AMOUNT DUE"
      const invoiceBody = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <tr>
            <td style="padding:0 0 18px 0;font-size:15px;line-height:1.65;color:#334155">
              Hello <strong>${escapeHtml(customer.first_name)}</strong>,<br>
              ${isPaid ? "We confirm receipt of your payment. Your paid invoice is available below and in your client portal." : "Your invoice is ready. A summary is provided below."}
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:0 0 20px 0">
          <tr>
            <td width="55%" valign="top" style="padding:18px;border-right:1px solid #e2e8f0">
              <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:7px">Billed to</div>
              <div style="font-size:15px;font-weight:700;color:#0f172a">${escapeHtml(`${customer.first_name} ${customer.last_name || ""}`)}</div>
              ${customerAddress ? `<div style="margin-top:5px;font-size:13px;line-height:1.5;color:#64748b">${escapeHtml(customerAddress)}</div>` : ""}
              <div style="margin-top:4px;font-size:13px;color:#64748b">${escapeHtml(customer.email)}</div>
            </td>
            <td width="45%" valign="top" align="right" style="padding:18px">
              <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:7px">Invoice</div>
              <div style="font-size:16px;font-weight:800;color:#0f172a">${escapeHtml(invoice.invoice_number)}</div>
              <div style="margin-top:5px;font-size:13px;color:#64748b">Issued ${escapeHtml(invoice.issue_date)}</div>
              ${invoice.due_date ? `<div style="margin-top:3px;font-size:13px;color:#64748b">Due ${escapeHtml(invoice.due_date)}</div>` : ""}
              <div style="margin-top:9px"><span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${isPaid ? "#d1fae5" : "#fef3c7"};color:${isPaid ? "#065f46" : "#92400e"};font-size:11px;font-weight:800">${statusLabel}</span></div>
            </td>
          </tr>
        </table>

        ${itemRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px 0;font-size:13px"><thead><tr style="background:#f8fafc"><th style="padding:10px;text-align:left;border:1px solid #e2e8f0;color:#475569">Description</th><th style="padding:10px;text-align:center;border:1px solid #e2e8f0;color:#475569">Qty</th><th style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#475569">Price</th><th style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#475569">Amount</th></tr></thead><tbody>${itemRows}</tbody></table>` : ""}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px 0">
          <tr>
            <td width="48%" valign="top" style="padding-right:12px">
              ${paymentRows ? `<div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:9px">Payment received</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px"><thead><tr><th style="padding:7px 4px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0">Date</th><th style="padding:7px 4px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0">Method</th><th style="padding:7px 4px;text-align:right;color:#64748b;border-bottom:1px solid #e2e8f0">Amount</th></tr></thead><tbody>${(payments || []).map((p) => `<tr><td style="padding:7px 4px;border-bottom:1px solid #f1f5f9">${escapeHtml(p.payment_date)}</td><td style="padding:7px 4px;border-bottom:1px solid #f1f5f9">${escapeHtml(paymentLabels[p.method] || p.method)}</td><td style="padding:7px 4px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${money(p.amount)}</td></tr>`).join("")}</tbody></table>` : ""}
            </td>
            <td width="52%" valign="top" style="padding-left:12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13px">
                <tr><td style="padding:12px 14px 5px;color:#475569">Subtotal before tax</td><td align="right" style="padding:12px 14px 5px;font-weight:700">${money(invoice.subtotal)}</td></tr>
                ${Number(invoice.discount_total || 0) > 0 ? `<tr><td style="padding:5px 14px;color:#475569">Discount</td><td align="right" style="padding:5px 14px;font-weight:700">-${money(invoice.discount_total)}</td></tr>` : ""}
                <tr><td style="padding:5px 14px;color:#475569">HST (${taxRate.toFixed(taxRate % 1 === 0 ? 0 : 2)} %)</td><td align="right" style="padding:5px 14px;font-weight:700">${money(invoice.tax_total)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #cbd5e1;font-size:16px;font-weight:800">Total</td><td align="right" style="padding:10px 14px;border-top:1px solid #cbd5e1;font-size:16px;font-weight:800">${money(invoice.total)}</td></tr>
                <tr><td style="padding:5px 14px;color:#047857">Amount paid</td><td align="right" style="padding:5px 14px;color:#047857;font-weight:800">${money(invoice.amount_paid)}</td></tr>
                <tr><td style="padding:10px 14px;border-top:1px solid #cbd5e1;font-size:15px;font-weight:800">Balance</td><td align="right" style="padding:10px 14px;border-top:1px solid #cbd5e1;font-size:15px;font-weight:800">${money(invoice.balance_due)}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        ${invoicePhotoHtml}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px 0">
          <tr><td align="center"><a href="${portalLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:800;font-size:14px">View Invoice & Download PDF</a></td></tr>
        </table>

        <div style="padding-top:17px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b">
          Ottawa Multiservices Group Inc.<br>
          ${escapeHtml(businessAddress)}${businessPhone ? `<br>${escapeHtml(businessPhone)}` : ""}${gstHstNumber ? `<br>GST/HST No. ${escapeHtml(gstHstNumber)}` : ""}
        </div>
        ${isPaid ? `<p style="margin:18px 0 0;color:#334155">Thank you for your payment and your business.</p>` : ""}
      `
      html = layout(isPaid ? "Paid invoice" : "Your invoice", invoiceBody)
    } else if (body.type === "booking_confirmed") {
      const customerId = await linkedCustomerId(user?.id)
      const { data: booking } = await admin.from("estimate_bookings").select("id,estimate_id,customer_id,starts_at,ends_at,status,estimate:estimates(estimate_number,title,total),customer:customers(first_name,last_name,email)").eq("id", body.bookingId).maybeSingle()
      if (!booking || !customerId || booking.customer_id !== customerId) throw new Error("Not authorized")
      const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
      const estimate = Array.isArray(booking.estimate) ? booking.estimate[0] : booking.estimate
      if (!customer?.email) throw new Error("Customer email missing")
      key = `booking-confirmed:${booking.id}:${booking.starts_at}`
      recordId = booking.id
      recipient = customer.email
      recipientType = "customer"
      subject = `Appointment booked — ${estimate?.estimate_number || "Ottawa Multiservices"}`
      html = layout("Your appointment is booked", `<p>Hello ${escapeHtml(customer.first_name)},</p><p>Your quote was accepted and your appointment is now booked.</p><div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:18px 0"><div style="font-size:18px;font-weight:700">${escapeHtml(dateTime(booking.starts_at))}</div><div style="margin-top:5px;color:#475569">Estimated end: ${escapeHtml(dateTime(booking.ends_at))}</div><div style="margin-top:8px">${escapeHtml(estimate?.title || "Service")}</div></div><p><strong>Important:</strong> signing the quote and booking the appointment confirms your commitment to have the service performed and to pay the invoice according to the accepted quote and any additional work you authorize.</p><p>We will send you the invoice after the service is completed.</p>`)
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
