import { useEffect, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatCad, formatDate } from "@/features/admin/formatters"
import { supabase } from "@/lib/supabase"
import { sendCrmEmail } from "@/lib/email-notifications"

export const Route = createFileRoute("/admin/estimates/$estimateId")({ component: EstimateDetailPage })

type Customer = { id: string; first_name: string; last_name: string | null; email: string; phone: string | null; address_line: string | null; city: string | null; province: string | null; postal_code: string | null }
type Estimate = { id: string; estimate_number: string; title: string | null; status: string; valid_until: string | null; subtotal: number; discount_total: number; tax_rate: number; tax_total: number; total: number; currency: string; notes: string | null; terms: string | null; created_at: string; service_request_id: string | null; estimated_duration_minutes: number | null; crew_size: number; sent_at: string | null; service_type: string; recurrence_frequency: string | null; contract_months: number | null; contract_discount_percent: number; deposit_type: string; deposit_value: number; customer: Customer | null }
type Item = { id: string; position: number; description: string; quantity: number; unit_price: number; line_total: number }
type Signature = { signer_name: string; signed_at: string; ip_address: string | null; user_agent: string | null; signature_data_url: string; consent_text: string }
type Booking = { starts_at: string; ends_at: string; status: string }

const labels: Record<string, string> = { draft: "Draft", pending_review: "Pending review", sent: "Sent", viewed: "Viewed", accepted: "Accepted", rejected: "Rejected", expired: "Expired", cancelled: "Cancelled", converted_to_job: "Converted to job" }

function EstimateDetailPage() {
  const { estimateId } = Route.useParams()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [signature, setSignature] = useState<Signature | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [status, setStatus] = useState("draft")
  const [durationHours, setDurationHours] = useState(2)
  const [crewSize, setCrewSize] = useState(1)
  const [serviceType, setServiceType] = useState("one_time")
  const [frequency, setFrequency] = useState("biweekly")
  const [contractMonths, setContractMonths] = useState(12)
  const [contractDiscount, setContractDiscount] = useState(0)
  const [depositType, setDepositType] = useState("none")
  const [depositValue, setDepositValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [rescheduleStart, setRescheduleStart] = useState("")
  const [rescheduleReason, setRescheduleReason] = useState("")

  useEffect(() => { void load() }, [estimateId])

  async function load() {
    setLoading(true)
    try {
      if (!(await requireActiveAdmin())) { await navigate({ to: "/admin/login" }); return }
      const [estimateResult, itemsResult, signatureResult, bookingResult] = await Promise.all([
        supabase.from("estimates").select("id,estimate_number,title,status,valid_until,subtotal,discount_total,tax_rate,tax_total,total,currency,notes,terms,created_at,service_request_id,estimated_duration_minutes,crew_size,sent_at,service_type,recurrence_frequency,contract_months,contract_discount_percent,deposit_type,deposit_value,customer:customers(id,first_name,last_name,email,phone,address_line,city,province,postal_code)").eq("id", estimateId).maybeSingle(),
        supabase.from("estimate_items").select("id,position,description,quantity,unit_price,line_total").eq("estimate_id", estimateId).order("position"),
        supabase.from("estimate_signatures").select("signer_name,signed_at,ip_address,user_agent,signature_data_url,consent_text").eq("estimate_id", estimateId).maybeSingle(),
        supabase.from("estimate_bookings").select("starts_at,ends_at,status").eq("estimate_id", estimateId).neq("status", "cancelled").maybeSingle(),
      ])
      if (estimateResult.error) throw estimateResult.error
      if (!estimateResult.data) throw new Error("Quote not found.")
      if (itemsResult.error) throw itemsResult.error
      const typed = estimateResult.data as unknown as Estimate
      setEstimate(typed)
      setStatus(typed.status)
      setDurationHours(Math.max(0.5, Number(typed.estimated_duration_minutes || 120) / 60))
      setCrewSize(Number(typed.crew_size || 1))
      setServiceType(typed.service_type || "one_time")
      setFrequency(typed.recurrence_frequency || "biweekly")
      setContractMonths(Number(typed.contract_months || 12))
      setContractDiscount(Number(typed.contract_discount_percent || 0))
      setDepositType(typed.deposit_type || "none")
      setDepositValue(Number(typed.deposit_value || 0))
      setItems((itemsResult.data ?? []) as Item[])
      setSignature((signatureResult.data ?? null) as Signature | null)
      setBooking((bookingResult.data ?? null) as Booking | null)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load the quote.") }
    finally { setLoading(false) }
  }

  async function savePlanning() {
    if (!estimate) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const user = await requireActiveAdmin(); if (!user) return
      const { error: updateError } = await supabase.from("estimates").update({ estimated_duration_minutes: Math.round(durationHours * 60), crew_size: crewSize, service_type: serviceType, recurrence_frequency: serviceType === "recurring" ? frequency : null, contract_months: serviceType === "recurring" ? contractMonths : null, contract_discount_percent: serviceType === "recurring" ? contractDiscount : 0, deposit_type: depositType, deposit_value: depositType === "none" ? 0 : depositValue, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", estimate.id)
      if (updateError) throw updateError
      setSuccess("Estimated duration and crew size were saved.")
      await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the duration.") }
    finally { setSaving(false) }
  }

  async function sendEstimate() {
    if (!estimate) return
    if (!durationHours || durationHours < 0.5) { setError("Enter the estimated duration before sending the quote."); return }
    setSaving(true); setError(""); setSuccess("")
    try {
      const user = await requireActiveAdmin(); if (!user) return
      const now = new Date().toISOString()
      const { error: updateError } = await supabase.from("estimates").update({ status: "sent", estimated_duration_minutes: Math.round(durationHours * 60), crew_size: crewSize, service_type: serviceType, recurrence_frequency: serviceType === "recurring" ? frequency : null, contract_months: serviceType === "recurring" ? contractMonths : null, contract_discount_percent: serviceType === "recurring" ? contractDiscount : 0, deposit_type: depositType, deposit_value: depositType === "none" ? 0 : depositValue, sent_at: now, updated_by: user.id, updated_at: now }).eq("id", estimate.id)
      if (updateError) throw updateError
      if (estimate.service_request_id) await supabase.from("service_requests").update({ status: "quote_sent", updated_at: now }).eq("id", estimate.service_request_id)
      const notification = await sendCrmEmail({ type: "estimate_ready", estimateId: estimate.id })
      setSuccess(notification.ok ? "The quote was sent to the customer with a secure link." : "The quote was marked as sent, but the email could not be sent.")
      await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to send the quote.") }
    finally { setSaving(false) }
  }

  async function rescheduleBooking() {
    if (!estimate || !booking || !rescheduleStart) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const { data: bookingId, error: rpcError } = await supabase.rpc("admin_reschedule_estimate_booking", { p_estimate_id: estimate.id, p_starts_at: new Date(rescheduleStart).toISOString(), p_reason: rescheduleReason.trim() || null })
      if (rpcError) throw rpcError
      if (bookingId) { const notification = await sendCrmEmail({ type: "booking_confirmed", bookingId: String(bookingId) }); if (!notification.ok) console.warn("Appointment changed, but confirmation email failed") }
      setSuccess("The appointment was rescheduled. The linked job was also updated when applicable.")
      setRescheduleStart(""); setRescheduleReason("")
      await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to reschedule appointment.") }
    finally { setSaving(false) }
  }

  async function updateStatus() {
    if (!estimate || status === estimate.status) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const user = await requireActiveAdmin(); if (!user) return
      const { error: updateError } = await supabase.from("estimates").update({ status, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", estimate.id)
      if (updateError) throw updateError
      setSuccess("Quote status updated.")
      await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update status.") }
    finally { setSaving(false) }
  }

  if (loading) return <p className="text-slate-600">Loading quote…</p>
  if (!estimate) return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error || "Quote not found."}</div>
  const customer = estimate.customer
  const labourHours = durationHours * crewSize

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/admin/estimates" className="text-sm font-semibold text-blue-700 hover:underline">← Back to quotes</Link><h1 className="mt-2 text-3xl font-bold">{estimate.estimate_number}</h1><p className="text-slate-600">{estimate.title || "Untitled quote"}</p></div><span className="w-fit rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold">{labels[estimate.status] ?? estimate.status}</span></header>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}{success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{success}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Customer</h2>{customer ? <div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Last name" value={`${customer.first_name} ${customer.last_name ?? ""}`} /><Info label="Email" value={customer.email} /><Info label="Phone" value={customer.phone} /><Info label="Address" value={[customer.address_line,customer.city,customer.province,customer.postal_code].filter(Boolean).join(", ")} /></div> : <p className="mt-3 text-slate-500">Customer unavailable.</p>}</section>
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><h2 className="border-b px-5 py-4 text-lg font-bold">Services</h2><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-sm"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y">{items.map((item)=><tr key={item.id}><td className="px-4 py-4">{item.description}</td><td className="px-4 py-4 text-right">{item.quantity}</td><td className="px-4 py-4 text-right">{formatCad(item.unit_price)}</td><td className="px-4 py-4 text-right font-semibold">{formatCad(item.line_total)}</td></tr>)}</tbody></table></div></section>
        {estimate.notes && <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Notes</h2><p className="mt-3 whitespace-pre-wrap text-slate-700">{estimate.notes}</p></section>}
        {estimate.terms && <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Terms</h2><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{estimate.terms}</p></section>}
        {signature && <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-emerald-800">Electronic signature</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Signer" value={signature.signer_name}/><Info label="Signature date and time" value={formatDateTime(signature.signed_at)}/><Info label="IP address" value={signature.ip_address}/><Info label="Browser" value={signature.user_agent}/>{booking && <><Info label="Appointment accepted" value={formatBookingSlot(booking.starts_at, booking.ends_at)}/><Info label="Appointment status" value={booking.status}/></>}</div><div className="mt-4 rounded-lg border bg-slate-50 p-4"><img src={signature.signature_data_url} alt={`Signature of ${signature.signer_name}`} className="max-h-40 max-w-full"/></div><p className="mt-4 text-xs text-slate-500">{signature.consent_text}</p></section>}
      </div>
      <aside className="space-y-6">
        <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Duration and crew</h2><div className="mt-4 grid gap-3"><label className="text-sm font-medium">Estimated on-site duration (hours)<input type="number" min="0.5" max="24" step="0.5" value={durationHours} onChange={(e)=>setDurationHours(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-sm font-medium">Number of employees<input type="number" min="1" max="20" step="1" value={crewSize} onChange={(e)=>setCrewSize(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><p className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{labourHours.toFixed(1)} labour-hours</strong> estimated.</p><button onClick={()=>void savePlanning()} disabled={saving} className="rounded-lg border px-4 py-2 font-semibold">Save</button></div></section>
        <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Service type and payment</h2><div className="mt-4 space-y-3 text-sm"><label className="block font-medium">Service<select value={serviceType} onChange={(e)=>setServiceType(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="one_time">One-time service</option><option value="recurring">Recurring contract</option></select></label>{serviceType === "recurring" && <><label className="block font-medium">Frequency<select value={frequency} onChange={(e)=>setFrequency(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></label><label className="block font-medium">Contract duration (months)<input type="number" min="1" max="36" value={contractMonths} onChange={(e)=>setContractMonths(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="block font-medium">Contract discount (%)<input type="number" min="0" max="100" step="0.5" value={contractDiscount} onChange={(e)=>setContractDiscount(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2"/></label></>}<label className="block font-medium">Deposit<select value={depositType} onChange={(e)=>setDepositType(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="none">No deposit</option><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>{depositType !== "none" && <label className="block font-medium">{depositType === "percent" ? "Deposit (%)" : "Deposit (CAD)"}<input type="number" min="0" step="0.01" value={depositValue} onChange={(e)=>setDepositValue(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>}<button onClick={()=>void savePlanning()} disabled={saving} className="w-full rounded-lg border px-4 py-2 font-semibold">Save terms</button></div></section>
        <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Total</h2><dl className="mt-4 space-y-3 text-sm"><Row label="Subtotal" value={formatCad(estimate.subtotal)} /><Row label="Discount" value={formatCad(estimate.discount_total)} /><Row label={`HST (${Math.round(Number(estimate.tax_rate)*100)} %)`} value={formatCad(estimate.tax_total)} /><div className="border-t pt-3"><Row label="Total" value={formatCad(estimate.total)} strong /></div></dl><p className="mt-4 text-xs text-slate-500">Created {formatDate(estimate.created_at)} · Valid until {formatDate(estimate.valid_until)}</p></section>
        {estimate.status === "draft" || estimate.status === "pending_review" ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-lg font-bold text-emerald-900">Ready to send?</h2><p className="mt-2 text-sm text-emerald-800">Review the price, estimated duration, crew size, and terms.</p><button onClick={()=>void sendEstimate()} disabled={saving} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving?"Sending…":"Send Quote"}</button></section> : null}
        {booking && booking.status !== "cancelled" && <section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-lg font-bold text-blue-900">Booked time slot</h2><p className="mt-3 font-semibold">{formatBookingDate(booking.starts_at)}</p><p className="mt-1 text-base font-bold text-blue-950">{formatBookingTimeRange(booking.starts_at, booking.ends_at)}</p><p className="mt-1 text-xs text-blue-700">Ottawa local time</p><div className="mt-4 border-t border-blue-200 pt-4"><p className="text-sm font-bold text-blue-950">Reschedule appointment</p><input type="datetime-local" value={rescheduleStart} onChange={(e)=>setRescheduleStart(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2"/><input value={rescheduleReason} onChange={(e)=>setRescheduleReason(e.target.value)} placeholder="Reason (optional)" className="mt-2 w-full rounded-lg border px-3 py-2"/><button onClick={()=>void rescheduleBooking()} disabled={saving || !rescheduleStart} className="mt-2 w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-40">Confirm new time slot</button><p className="mt-2 text-xs text-blue-700">The system automatically rejects a time slot that is already booked or blocked.</p></div></section>}
        <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Job</h2>{estimate.status === "accepted" ? <Link to="/admin/jobs/new" search={{ estimateId: estimate.id }} className="mt-4 block rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-semibold text-white">Convert to Job</Link> : estimate.status === "converted_to_job" ? <p className="mt-3 text-sm font-semibold text-emerald-700">This quote has already been converted.</p> : <p className="mt-3 text-sm text-slate-600">The quote must be accepted before conversion.</p>}</section>
        <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Change status</h2><select value={status} onChange={(e)=>setStatus(e.target.value)} className="mt-4 w-full rounded-lg border px-3 py-2">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button onClick={()=>void updateStatus()} disabled={saving || status===estimate.status} className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-40">Update</button></section>
        {(estimate.status === "accepted" || estimate.status === "converted_to_job") && <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Invoicing</h2><Link to="/admin/invoices/new" search={{ estimateId: estimate.id }} className="mt-4 block rounded-lg bg-blue-700 px-4 py-2.5 text-center font-semibold text-white">Create Invoice</Link></section>}
      </aside>
    </div>
  </div>
}

function Info({label,value}:{label:string;value:string|null|undefined}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900">{value || "—"}</dd></div>}
function Row({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className={`flex justify-between gap-4 ${strong?"text-lg font-bold":""}`}><dt>{label}</dt><dd>{value}</dd></div>}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}
function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
}
function formatBookingTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit" })
  return `${formatter.format(new Date(startsAt))} – ${formatter.format(new Date(endsAt))}`
}
function formatBookingSlot(startsAt: string, endsAt: string) {
  return `${formatBookingDate(startsAt)} · ${formatBookingTimeRange(startsAt, endsAt)}`
}
