import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { CalendarDays, CheckCircle2, Download, Eye, FileSignature, FileText, LogOut, ReceiptText, RotateCcw, UserRound, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { sendCrmEmail } from "@/lib/email-notifications"
import { formatCad, formatDate } from "@/features/admin/formatters"
import { LanguageSwitcher, useLanguage } from "@/lib/language"

export const Route = createFileRoute("/portal")({ head: () => ({ meta: [{ title: "Customer Portal | Ottawa Multiservices Group" }, { name: "robots", content: "noindex, nofollow, noarchive" }] }), component: CustomerPortal })

type Customer = { id: string; first_name: string; last_name: string | null; email: string; phone: string | null; address_line: string | null; city: string | null; province: string | null; postal_code: string | null; preferred_language?: "en" | "fr" | null }
type Estimate = { id: string; estimate_number: string; title: string | null; status: string; valid_until: string | null; total: number; created_at: string; estimated_duration_minutes: number | null; crew_size: number }
type Invoice = { id: string; invoice_number: string; title: string | null; status: string; issue_date: string; due_date: string | null; subtotal: number; discount_total: number; tax_rate: number; tax_total: number; total: number; amount_paid: number; balance_due: number; currency: string; job_id: string | null }
type InvoicePhoto = { id: string; job_id: string; storage_path: string; caption: string | null; url: string }
type InvoiceItem = { id: string; invoice_id: string; description: string; quantity: number; unit_price: number; line_total: number }
type Payment = { id: string; invoice_id: string; amount: number; payment_date: string; method: string; reference: string | null }
type Job = { id: string; job_number: string; title: string; status: string; scheduled_start: string | null; address_line: string | null; city: string | null }
type Signature = { estimate_id: string; signer_name: string; signed_at: string }
type Booking = { id: string; estimate_id: string; starts_at: string; ends_at: string; status: string }
type Slot = { startsAt: string; endsAt: string; label: string }

const statusLabel: Record<string, string> = { draft: "Draft", pending_review: "Pending review", sent: "Sent", viewed: "Viewed", accepted: "Accepted", rejected: "Rejected", expired: "Expired", cancelled: "Cancelled", converted_to_job: "Converted", partially_paid: "Partially paid", paid: "Paid", overdue: "Overdue", void: "Cancelled", unscheduled: "Unscheduled", scheduled: "Scheduled", in_progress: "In progress", completed: "Completed" }

function CustomerPortal() {
  const { language } = useLanguage()
  const [sessionReady, setSessionReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceItems, setInvoiceItems] = useState<Record<string, InvoiceItem[]>>({})
  const [invoicePayments, setInvoicePayments] = useState<Record<string, Payment[]>>({})
  const [invoicePhotos, setInvoicePhotos] = useState<Record<string, InvoicePhoto[]>>({})
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [signatures, setSignatures] = useState<Record<string, Signature>>({})
  const [signingEstimate, setSigningEstimate] = useState<Estimate | null>(null)
  const [signingSlot, setSigningSlot] = useState<Slot | null>(null)
  const [bookingEstimate, setBookingEstimate] = useState<Estimate | null>(null)
  const [bookings, setBookings] = useState<Record<string, Booking>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loggedIn || !customer || customer.preferred_language === language) return
    void supabase.rpc("set_my_preferred_language", { p_language: language }).then(({ error }) => {
      if (error) console.warn("Unable to save language preference", error)
      else setCustomer((current) => current ? { ...current, preferred_language: language } : current)
    })
  }, [language, loggedIn, customer?.id, customer?.preferred_language])

  useEffect(() => {
    void initialise()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session))
      if (session) void loadPortal()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function initialise() {
    const { data } = await supabase.auth.getSession()
    setLoggedIn(Boolean(data.session))
    setSessionReady(true)
    if (data.session) await loadPortal()
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError("")
    setMessage("")
    const { error: signInError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/portal` } })
    setSending(false)
    if (signInError) setError(signInError.message)
    else setMessage("A secure sign-in link has been sent to your email address.")
  }

  async function loadPortal() {
    setError("")

    // Self-heal the portal link. This is important when an Auth user already
    // existed before the CRM customer record was created (for example after
    // test data was reset while Supabase Auth users were kept).
    let { data: account, error: accountError } = await supabase
      .from("customer_accounts")
      .select("customer_id")
      .maybeSingle()

    if (accountError) {
      setCustomer(null)
      setError(accountError.message)
      return
    }

    if (!account) {
      const { error: linkError } = await supabase.rpc("ensure_my_customer_account")
      if (!linkError) {
        const retry = await supabase
          .from("customer_accounts")
          .select("customer_id")
          .maybeSingle()
        account = retry.data
        accountError = retry.error
      }
    }

    if (accountError || !account) {
      setCustomer(null)
      setError("No customer account is associated with this email address. Contact Ottawa Multiservices Group at (613) 407-6699 so we can verify your email.")
      return
    }
    const customerId = account.customer_id
    const [customerResult, estimatesResult, invoicesResult, jobsResult, signaturesResult, bookingsResult] = await Promise.all([
      supabase.from("customers").select("id,first_name,last_name,email,phone,address_line,city,province,postal_code,preferred_language").eq("id", customerId).single(),
      supabase.from("estimates").select("id,estimate_number,title,status,valid_until,total,created_at,estimated_duration_minutes,crew_size").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("id,invoice_number,title,status,issue_date,due_date,subtotal,discount_total,tax_rate,tax_total,total,amount_paid,balance_due,currency,job_id").eq("customer_id", customerId).order("issue_date", { ascending: false }),
      supabase.from("jobs").select("id,job_number,title,status,scheduled_start,address_line,city").eq("customer_id", customerId).order("scheduled_start", { ascending: true }),
      supabase.from("estimate_signatures").select("estimate_id,signer_name,signed_at").eq("customer_id", customerId),
      supabase.from("estimate_bookings").select("id,estimate_id,starts_at,ends_at,status").eq("customer_id", customerId).neq("status", "cancelled"),
    ])
    if (customerResult.error) { setError(customerResult.error.message); return }
    setCustomer(customerResult.data as Customer)
    setEstimates((estimatesResult.data ?? []) as Estimate[])
    const invoiceRows = (invoicesResult.data ?? []) as Invoice[]
    setInvoices(invoiceRows)
    if (invoiceRows.length) {
      const invoiceIds = invoiceRows.map((invoice) => invoice.id)
      const [itemsResult, paymentsResult] = await Promise.all([
        supabase.from("invoice_items").select("id,invoice_id,description,quantity,unit_price,line_total").in("invoice_id", invoiceIds).order("position"),
        supabase.from("payments").select("id,invoice_id,amount,payment_date,method,reference").in("invoice_id", invoiceIds).order("payment_date", { ascending: false }),
      ])
      const itemMap: Record<string, InvoiceItem[]> = {}
      for (const item of (itemsResult.data ?? []) as InvoiceItem[]) (itemMap[item.invoice_id] ??= []).push(item)
      const paymentMap: Record<string, Payment[]> = {}
      for (const payment of (paymentsResult.data ?? []) as Payment[]) (paymentMap[payment.invoice_id] ??= []).push(payment)
      setInvoiceItems(itemMap)
      setInvoicePayments(paymentMap)
      const photoMap: Record<string, InvoicePhoto[]> = {}
      const jobIds = invoiceRows.map((invoice) => invoice.job_id).filter((id): id is string => Boolean(id))
      if (jobIds.length) {
        const { data: photoRows, error: photoError } = await supabase.from("job_photos").select("id,job_id,storage_path,caption").in("job_id", jobIds).eq("kind", "after").order("created_at")
        if (!photoError) {
          const signedRows = await Promise.all(((photoRows ?? []) as Omit<InvoicePhoto, "url">[]).map(async (photo) => {
            const { data } = await supabase.storage.from("service-photos").createSignedUrl(photo.storage_path, 3600)
            return data?.signedUrl ? { ...photo, url: data.signedUrl } : null
          }))
          for (const photo of signedRows.filter(Boolean) as InvoicePhoto[]) {
            const invoice = invoiceRows.find((row) => row.job_id === photo.job_id)
            if (invoice) (photoMap[invoice.id] ??= []).push(photo)
          }
        }
      }
      setInvoicePhotos(photoMap)
      const requestedInvoiceId = new URLSearchParams(window.location.search).get("invoice")
      const requestedInvoice = requestedInvoiceId ? invoiceRows.find((invoice) => invoice.id === requestedInvoiceId) : null
      if (requestedInvoice) setViewingInvoice(requestedInvoice)
    } else {
      setInvoiceItems({})
      setInvoicePayments({})
      setInvoicePhotos({})
    }
    setJobs((jobsResult.data ?? []) as Job[])
    const signatureMap = Object.fromEntries(((signaturesResult.data ?? []) as Signature[]).map((signature) => [signature.estimate_id, signature]))
    setSignatures(signatureMap)
    const bookingMap = Object.fromEntries(((bookingsResult.data ?? []) as Booking[]).map((booking) => [booking.estimate_id, booking]))
    setBookings(bookingMap)
  }

  async function rejectEstimate(id: string) {
    setError("")
    const { error: responseError } = await supabase.rpc("customer_respond_to_estimate", { p_estimate_id: id, p_response: "rejected" })
    if (responseError) { setError(responseError.message); return }
    await loadPortal()
  }

  function durationText(estimate: Estimate) {
    const minutes = Number(estimate.estimated_duration_minutes || 0)
    if (!minutes) return "Duration to be confirmed"
    const hours = minutes / 60
    const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
    return `${hoursText} on-site hours · crew of ${estimate.crew_size || 1} · ${(hours * (estimate.crew_size || 1)).toFixed(1)} labour-hours`
  }

  async function logout() {
    await supabase.auth.signOut()
    setCustomer(null); setEstimates([]); setInvoices([]); setInvoiceItems({}); setInvoicePayments({}); setInvoicePhotos({}); setViewingInvoice(null); setJobs([]); setSignatures({}); setBookings({}); setLoggedIn(false)
  }

  if (!sessionReady) return <div className="grid min-h-screen place-items-center bg-slate-50">Loading…</div>
  if (!loggedIn) return <div className="min-h-screen bg-slate-50"><PortalHeader /><main className="mx-auto max-w-md px-6 py-20"><div className="rounded-2xl border bg-white p-7 shadow-sm"><p className="text-sm font-semibold text-emerald-700">CLIENT PORTAL</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Access your account</h1><p className="mt-3 text-slate-600">Receive a secure sign-in link by email. No password is required.</p>{error && <Alert text={error} />}{message && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}<form onSubmit={sendLink} className="mt-6"><label className="text-sm font-semibold">Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="name@example.ca" /></label><button disabled={sending} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700">{sending ? "Sending…" : "Send me a sign-in link"}</button></form><p className="mt-5 text-center text-xs text-slate-500">Use the same email address you provided when requesting your quote.</p></div></main></div>

  return <div className="min-h-screen bg-slate-100"><PortalHeader customer={customer} onLogout={logout} /><main className="mx-auto max-w-6xl space-y-8 px-5 py-8">{error && <Alert text={error} />}<section><p className="text-sm font-semibold text-emerald-700">CLIENT PORTAL</p><h1 className="mt-1 text-3xl font-bold">Hello {customer?.first_name ?? ""}</h1><p className="text-slate-600">Review and sign your quotes, then track your invoices and jobs.</p></section><div className="grid gap-4 sm:grid-cols-3"><Stat icon={ReceiptText} label="Quotes" value={estimates.length} /><Stat icon={FileText} label="Balance due" value={formatCad(invoices.reduce((total, invoice) => total + Number(invoice.balance_due), 0))} /><Stat icon={CalendarDays} label="Jobs" value={jobs.length} /></div><Section title="My Quotes"><div className="grid gap-4">{estimates.length === 0 ? <Empty /> : estimates.map((estimate) => { const signature = signatures[estimate.id]; const booking = bookings[estimate.id]; const canRespond = ["sent", "viewed", "pending_review"].includes(estimate.status); return <article id={`estimate-${estimate.id}`} key={estimate.id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-blue-700">{estimate.estimate_number}</p><h3 className="text-lg font-semibold">{estimate.title || "Service quote"}</h3><p className="text-sm text-slate-500">Created {formatDate(estimate.created_at)}{estimate.valid_until && ` · Valid until ${formatDate(estimate.valid_until)}`}</p></div><div className="text-right"><p className="text-xl font-bold">{formatCad(estimate.total)}</p><Badge status={estimate.status} /></div></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><strong>Estimated duration:</strong> {durationText(estimate)}</div>{signature && <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Electronically signed by {signature.signer_name}</p><p>Signed {formatDate(signature.signed_at)}</p></div></div>}{booking && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Appointment booked</p><p className="mt-1">{formatDate(booking.starts_at)} → {formatDate(booking.ends_at)}</p>{signature && booking.status !== "cancelled" && <button onClick={() => setBookingEstimate(estimate)} className="mt-3 rounded-lg border border-blue-300 bg-white px-3 py-2 font-semibold text-blue-800">Reschedule my appointment</button>}</div>}{canRespond && !signature && <div className="mt-4 flex flex-wrap gap-3 border-t pt-4"><button onClick={() => setBookingEstimate(estimate)} className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><CalendarDays className="mr-2 h-4 w-4" />Choose a time and sign</button><button onClick={() => void rejectEstimate(estimate.id)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Reject</button></div>}{estimate.status === "accepted" && signature && !booking && <div className="mt-4 border-t pt-4"><button onClick={() => setBookingEstimate(estimate)} className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><CalendarDays className="mr-2 h-4 w-4" />Choose my appointment</button></div>}</article> })}</div></Section><Section title="My Invoices"><div className="grid gap-4">{invoices.length === 0 ? <Empty /> : invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} payments={invoicePayments[invoice.id] ?? []} onView={() => setViewingInvoice(invoice)} onDownload={() => void downloadInvoicePdf(invoice, customer, invoiceItems[invoice.id] ?? [], invoicePayments[invoice.id] ?? [], invoicePhotos[invoice.id] ?? [], language)} />)}</div></Section><Section title="My Jobs"><div className="grid gap-4 md:grid-cols-2">{jobs.length === 0 ? <Empty /> : jobs.map((job) => <article key={job.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">{job.job_number}</p><h3 className="font-bold">{job.title}</h3></div><Badge status={job.status} /></div><p className="mt-3 text-sm text-slate-600">{job.scheduled_start ? formatDate(job.scheduled_start) : "Date to be confirmed"}</p>{(job.address_line || job.city) && <p className="mt-1 text-sm text-slate-500">{[job.address_line, job.city].filter(Boolean).join(", ")}</p>}</article>)}</div></Section></main>{viewingInvoice && customer && <InvoiceDialog invoice={viewingInvoice} customer={customer} items={invoiceItems[viewingInvoice.id] ?? []} payments={invoicePayments[viewingInvoice.id] ?? []} photos={invoicePhotos[viewingInvoice.id] ?? []} onClose={() => setViewingInvoice(null)} onDownload={() => void downloadInvoicePdf(viewingInvoice, customer, invoiceItems[viewingInvoice.id] ?? [], invoicePayments[viewingInvoice.id] ?? [], invoicePhotos[viewingInvoice.id] ?? [], language)} />}{signingEstimate && signingSlot && customer && <SignatureDialog estimate={signingEstimate} slot={signingSlot} defaultName={`${customer.first_name} ${customer.last_name ?? ""}`.trim()} onClose={() => { setSigningEstimate(null); setSigningSlot(null) }} onSigned={async () => { setSigningEstimate(null); setSigningSlot(null); await loadPortal() }} />}{bookingEstimate && <BookingDialog estimate={bookingEstimate} onClose={() => setBookingEstimate(null)} confirmLabel={signatures[bookingEstimate.id] ? "Confirm this appointment" : "Continue to signature"} onConfirm={async (slot) => { const estimate = bookingEstimate; if (!estimate) return; if (signatures[estimate.id]) { const existingBooking = bookings[estimate.id]; const rpcName = existingBooking ? "customer_reschedule_estimate_booking" : "customer_book_estimate_slot"; const { data: bookingId, error: rpcError } = await supabase.rpc(rpcName, { p_estimate_id: estimate.id, p_starts_at: slot.startsAt }); if (rpcError) throw rpcError; const notification = await sendCrmEmail({ type: "booking_confirmed", bookingId: String(bookingId), language }); if (!notification.ok) console.warn("Booking saved, but confirmation email failed"); setBookingEstimate(null); await loadPortal(); return } setBookingEstimate(null); setSigningSlot(slot); setSigningEstimate(estimate) }} />}</div>
}


const paymentLabel: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit card",
  debit_card: "Debit card",
  etransfer: "Interac e-Transfer",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  other: "Other",
}

function formatTaxRate(rate: number) {
  const percent = Number(rate || 0) * 100
  return Number.isInteger(percent) ? `${percent}` : percent.toFixed(2)
}

function InvoiceCard({ invoice, payments, onView, onDownload }: { invoice: Invoice; payments: Payment[]; onView: () => void; onDownload: () => void }) {
  const paid = Number(invoice.balance_due || 0) <= 0 || invoice.status === "paid"
  const lastPayment = payments[0]
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-bold text-slate-950">{invoice.invoice_number}</p><Badge status={invoice.status} /></div><p className="mt-1 text-sm text-slate-500">Issued {formatDate(invoice.issue_date)}{invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ""}</p>{lastPayment && <p className="mt-2 text-sm text-slate-600">Last payment: {paymentLabel[lastPayment.method] ?? lastPayment.method} · {formatCad(lastPayment.amount)}</p>}</div><div className="sm:text-right"><p className="text-sm text-slate-500">Total</p><p className="text-2xl font-bold text-slate-950">{formatCad(invoice.total)}</p><p className={`mt-1 text-sm font-semibold ${paid ? "text-emerald-700" : "text-amber-700"}`}>{paid ? "Paid in full" : `Balance ${formatCad(invoice.balance_due)}`}</p></div></div><div className="flex flex-wrap gap-2 border-t bg-slate-50 px-5 py-4"><button type="button" onClick={onView} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"><Eye className="mr-2 h-4 w-4" />View invoice</button><button type="button" onClick={onDownload} className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"><Download className="mr-2 h-4 w-4" />Download PDF</button></div></article>
}

function InvoiceDialog({ invoice, customer, items, payments, photos, onClose, onDownload }: { invoice: Invoice; customer: Customer; items: InvoiceItem[]; payments: Payment[]; photos: InvoicePhoto[]; onClose: () => void; onDownload: () => void }) {
  const paid = Number(invoice.balance_due || 0) <= 0 || invoice.status === "paid"
  const address = [customer.address_line, customer.city, customer.province, customer.postal_code].filter(Boolean).join(", ")
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4"><div className="mx-auto my-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b bg-slate-950 px-6 py-4 text-white"><div><p className="text-xs font-semibold tracking-[0.2em] text-teal-600">OTTAWA MULTISERVICES</p><p className="mt-1 text-lg font-bold">Ottawa Multiservices Group Inc.</p></div><div className="flex gap-2"><button onClick={onDownload} className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold"><Download className="mr-2 h-4 w-4" />PDF</button><button onClick={onClose} className="rounded-lg border border-slate-700 p-2"><X className="h-5 w-5" /></button></div></div><div className="p-6 sm:p-8"><div className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billed to</p><p className="mt-2 text-lg font-bold">{customer.first_name} {customer.last_name ?? ""}</p><p className="text-sm text-slate-600">{address || "Address on file"}</p><p className="text-sm text-slate-600">{customer.email}</p>{customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}</div><div className="sm:text-right"><p className="text-3xl font-black text-slate-950">INVOICE</p><p className="mt-2 font-bold">{invoice.invoice_number}</p><p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{paid ? "PAID" : "AMOUNT DUE"}</p><p className="mt-3 text-sm text-slate-500">Issued {formatDate(invoice.issue_date)}</p>{invoice.due_date && <p className="text-sm text-slate-500">Due {formatDate(invoice.due_date)}</p>}</div></div><div className="mt-6 overflow-x-auto rounded-xl border"><table className="w-full min-w-[560px] text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Unit price</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{items.length ? items.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.description}</td><td className="px-4 py-3 text-center">{Number(item.quantity)}</td><td className="px-4 py-3 text-right">{formatCad(item.unit_price)}</td><td className="px-4 py-3 text-right font-semibold">{formatCad(item.line_total)}</td></tr>) : <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">Service details are not available.</td></tr>}</tbody></table></div>{photos.length > 0 && <section className="mt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-950">Completed work photos</h3><p className="text-sm text-slate-500">Photos attached to this invoice after the job.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{photos.length} photo(s)</span></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo) => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border bg-slate-50"><img src={photo.url} alt={photo.caption ?? "Work completed"} className="h-40 w-full object-cover"/><div className="p-2 text-xs font-medium text-slate-600">{photo.caption || "After work"}</div></a>)}</div></section>}<div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]"><div>{payments.length > 0 && <div><h3 className="font-bold">Payments</h3><div className="mt-3 overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-left">Reference</th><th className="px-3 py-2 text-right">Amount</th></tr></thead><tbody className="divide-y">{payments.map((payment) => <tr key={payment.id}><td className="px-3 py-2">{formatDate(payment.payment_date)}</td><td className="px-3 py-2">{paymentLabel[payment.method] ?? payment.method}</td><td className="px-3 py-2">{payment.reference || "—"}</td><td className="px-3 py-2 text-right font-semibold">{formatCad(payment.amount)}</td></tr>)}</tbody></table></div></div>}</div><div className="rounded-xl border bg-slate-50 p-5 text-sm"><div className="flex justify-between py-1"><span>Subtotal before tax</span><strong>{formatCad(invoice.subtotal)}</strong></div>{Number(invoice.discount_total || 0) > 0 && <div className="flex justify-between py-1"><span>Discount</span><strong>-{formatCad(invoice.discount_total)}</strong></div>}<div className="flex justify-between py-1"><span>HST ({formatTaxRate(invoice.tax_rate)} %)</span><strong>{formatCad(invoice.tax_total)}</strong></div><div className="mt-2 flex justify-between border-t pt-3 text-lg"><span>Total</span><strong>{formatCad(invoice.total)}</strong></div><div className="flex justify-between py-1 text-emerald-700"><span>Paid</span><strong>{formatCad(invoice.amount_paid)}</strong></div><div className="mt-2 flex justify-between border-t pt-3 text-lg"><span>Balance</span><strong>{formatCad(invoice.balance_due)}</strong></div></div></div><div className="mt-8 border-t pt-5 text-xs text-slate-500"><p>Ottawa Multiservices Group Inc. · Ottawa, Ontario, Canada · <a href="tel:+16134076699" className="font-semibold text-slate-700">(613) 407-6699</a></p><p>Keep this invoice for your records.</p></div></div></div></div>
}

async function downloadInvoicePdf(invoice: Invoice, customer: Customer | null, items: InvoiceItem[], payments: Payment[], photos: InvoicePhoto[] = [], language: "en" | "fr" = "en") {
  if (!customer) return
  const fr = language === "fr"
  const tPdf = (en: string, frText: string) => fr ? frText : en
  const pdfDate = (value: string) => new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(value))
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 44
  const right = pageWidth - margin
  const address = [customer.address_line, customer.city, customer.province, customer.postal_code].filter(Boolean).join(", ")
  const paid = Number(invoice.balance_due || 0) <= 0 || invoice.status === "paid"
  let y = 50
  doc.setFillColor(2, 8, 23); doc.rect(0, 0, pageWidth, 118, "F")
  doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("OTTAWA MULTISERVICES", margin, 42)
  doc.setTextColor(255,255,255); doc.setFontSize(17); doc.text("Ottawa Multiservices Group Inc.", margin, 68)
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Ottawa, Ontario, Canada", margin, 88); doc.text("admin1@ottawamultiservicesgroup.com", margin, 103)
  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text(tPdf("INVOICE", "FACTURE"), right, 52, { align: "right" }); doc.setFontSize(12); doc.text(invoice.invoice_number, right, 74, { align: "right" })
  doc.setFontSize(9); doc.text(paid ? tPdf("PAID", "PAYÉE") : tPdf("AMOUNT DUE", "MONTANT DÛ"), right, 96, { align: "right" })
  doc.setTextColor(15,23,42); y=150
  doc.setFontSize(9); doc.setTextColor(100,116,139); doc.text(tPdf("BILL TO", "FACTURÉ À"), margin, y); doc.setTextColor(15,23,42); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`${customer.first_name} ${customer.last_name ?? ""}`.trim(), margin, y+20)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(71,85,105); if(address) doc.text(address, margin, y+36); doc.text(customer.email, margin, y+51)
  doc.setTextColor(100,116,139); doc.text(tPdf("Issue date", "Date d’émission"), right-160, y); doc.setTextColor(15,23,42); doc.text(pdfDate(invoice.issue_date), right, y, { align:"right" }); if(invoice.due_date){doc.setTextColor(100,116,139); doc.text(tPdf("Due date", "Date d’échéance"), right-160, y+18); doc.setTextColor(15,23,42); doc.text(pdfDate(invoice.due_date), right, y+18, {align:"right"})}
  y=230; doc.setFillColor(248,250,252); doc.rect(margin,y,right-margin,26,"F"); doc.setFont("helvetica","bold"); doc.setTextColor(51,65,85); doc.text(tPdf("Description", "Description"), margin+8,y+17); doc.text(tPdf("Qty", "Qté"), 360,y+17,{align:"center"}); doc.text(tPdf("Price", "Prix"), 455,y+17,{align:"right"}); doc.text(tPdf("Amount", "Montant"), right-8,y+17,{align:"right"}); y+=38
  doc.setFont("helvetica","normal"); doc.setTextColor(15,23,42)
  for(const item of items){ const lines=doc.splitTextToSize(item.description,250); doc.text(lines,margin+8,y); doc.text(String(Number(item.quantity)),360,y,{align:"center"}); doc.text(formatCad(item.unit_price),455,y,{align:"right"}); doc.text(formatCad(item.line_total),right-8,y,{align:"right"}); y += Math.max(22, lines.length*12+8) }
  if(!items.length){doc.setTextColor(100,116,139);doc.text(tPdf("Service details are not available.", "Les détails du service ne sont pas disponibles."),margin+8,y);y+=24}
  y+=10; const totalsX=360; doc.setFillColor(248,250,252); doc.roundedRect(totalsX,y,right-totalsX,126,7,7,"F"); const totalLine=(label:string,value:string,offset:number,bold=false)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setTextColor(71,85,105);doc.text(label,totalsX+12,y+offset);doc.setTextColor(15,23,42);doc.text(value,right-12,y+offset,{align:"right"})}; totalLine(tPdf("Subtotal before tax", "Sous-total avant taxes"),formatCad(invoice.subtotal),20); let off=38; if(Number(invoice.discount_total||0)>0){totalLine(tPdf("Discount", "Rabais"),`-${formatCad(invoice.discount_total)}`,off);off+=18} totalLine(`HST (${formatTaxRate(invoice.tax_rate)} %)`,formatCad(invoice.tax_total),off);off+=22; totalLine(tPdf("Total", "Total"),formatCad(invoice.total),off,true);off+=20; totalLine(tPdf("Amount paid", "Montant payé"),formatCad(invoice.amount_paid),off);off+=20; totalLine(tPdf("Balance", "Solde"),formatCad(invoice.balance_due),off,true); y+=150
  if(payments.length){doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(tPdf("Payments", "Paiements"),margin,y);y+=18;doc.setFontSize(9);for(const payment of payments){doc.setFont("helvetica","normal");doc.text(`${pdfDate(payment.payment_date)}  ·  ${paymentLabel[payment.method] ?? payment.method}${payment.reference?`  ·  Ref. ${payment.reference}`:""}`,margin,y);doc.setFont("helvetica","bold");doc.text(formatCad(payment.amount),right,y,{align:"right"});y+=18}}
  doc.setDrawColor(226,232,240); doc.line(margin,720,right,720); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,116,139); doc.text("Ottawa Multiservices Group Inc. · Ottawa, Ontario, Canada · (613) 407-6699",margin,740); doc.text(tPdf("Thank you for your business.", "Merci de votre confiance."),right,740,{align:"right"})
  if (photos.length) {
    for (let index = 0; index < photos.length; index++) {
      try {
        const response = await fetch(photos[index].url)
        const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob) })
        if (index % 2 === 0) { doc.addPage(); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15,23,42); doc.text(tPdf("Completed work photos", "Photos du travail terminé"), margin, 42) }
        const yPhoto = index % 2 === 0 ? 65 : 400
        doc.addImage(dataUrl, "JPEG", margin, yPhoto, right - margin, 290, undefined, "FAST")
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100,116,139); doc.text(photos[index].caption || `Photo ${index + 1}`, margin, yPhoto + 305)
      } catch (photoError) { console.warn("Unable to add a photo to the PDF", photoError) }
    }
  }
  doc.save(`${invoice.invoice_number}.pdf`)
}

function SignatureDialog({ estimate, slot, defaultName, onClose, onSigned }: { estimate: Estimate; slot: Slot; defaultName: string; onClose: () => void; onSigned: () => Promise<void> }) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [name, setName] = useState(defaultName)
  const [consent, setConsent] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { resizeCanvas() }, [])
  function resizeCanvas() { const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.floor(rect.width * ratio)); canvas.height = Math.max(1, Math.floor(180 * ratio)); const context = canvas.getContext("2d"); if (!context) return; context.scale(ratio, ratio); context.lineWidth = 2.5; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#0f172a" }
  function point(event: PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }
  function start(event: PointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const context = event.currentTarget.getContext("2d"); const p = point(event); context?.beginPath(); context?.moveTo(p.x, p.y) }
  function move(event: PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); const p = point(event); context?.lineTo(p.x, p.y); context?.stroke(); setHasSignature(true) }
  function stop() { drawing.current = false }
  function clear() { const canvas = canvasRef.current; if (!canvas) return; const context = canvas.getContext("2d"); context?.clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false) }
  async function sign() { if (!name.trim() || !consent || !hasSignature) { setError("Enter your name, draw your signature, and accept the statement."); return } setSaving(true); setError(""); try { const canvas = canvasRef.current; if (!canvas) throw new Error("Signature is unavailable."); const { data, error: invokeError } = await supabase.functions.invoke("sign-estimate", { body: { estimateId: estimate.id, signerName: name.trim(), signatureDataUrl: canvas.toDataURL("image/png"), consentAccepted: consent, bookingStartsAt: slot.startsAt } }); if (invokeError) throw invokeError; if (data?.error) throw new Error(data.error); const notification = await sendCrmEmail({ type: "estimate_accepted", estimateId: estimate.id }); if (!notification.ok) console.warn("Estimate signed, but admin email was not sent."); if (data?.bookingId) { const bookingNotification = await sendCrmEmail({ type: "booking_confirmed", bookingId: String(data.bookingId), language }); if (!bookingNotification.ok) console.warn("Appointment booked, but confirmation email was not sent.") } await onSigned() } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the signature.") } finally { setSaving(false) } }

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">ELECTRONIC SIGNATURE</p><h2 className="mt-1 text-2xl font-bold">{estimate.estimate_number}</h2><p className="text-slate-600">{estimate.title || "Service quote"} · {formatCad(estimate.total)}</p></div><button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">Close</button></div>{error && <Alert text={error} />}<div className="mt-6 space-y-5"><div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Selected time before signing</p><p className="mt-1">{formatDate(slot.startsAt)} → {formatDate(slot.endsAt)}</p><button type="button" onClick={onClose} className="mt-2 text-sm font-semibold text-blue-700 underline">Change time slot</button></div><label className="block text-sm font-semibold">Full name of signer<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="mt-2 w-full rounded-lg border px-3 py-2.5" /></label><div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold">Draw your signature</label><button type="button" onClick={clear} className="inline-flex items-center text-sm font-semibold text-blue-700"><RotateCcw className="mr-1 h-4 w-4" />Clear</button></div><canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="h-[180px] w-full touch-none rounded-lg border-2 border-dashed bg-slate-50" /></div><label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 text-sm"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4" /><span>I confirm that I have reviewed this quote, including the estimated duration, and accept the services, price, notes, and terms shown. I selected the time slot above. By signing this quote, I confirm this appointment and agree to have the service performed and to pay the invoice according to the accepted quote and any additional work I expressly authorize.</span></label><p className="text-xs text-slate-500">The date, time, customer account, available IP address, and browser information will be recorded as evidence of acceptance.</p><button type="button" onClick={() => void sign()} disabled={saving || !consent || !hasSignature || !name.trim()} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Sign and accept quote"}</button></div></div></div>
}

function BookingDialog({ estimate, onClose, onConfirm, confirmLabel }: { estimate: Estimate; onClose: () => void; onConfirm: (slot: Slot) => Promise<void> | void; confirmLabel: string }) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const [date, setDate] = useState(tomorrow.toISOString().slice(0,10))
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { void loadSlots() }, [date, estimate.id])
  async function loadSlots() {
    setLoading(true); setError(""); setSelected(null)
    const { data, error: invokeError } = await supabase.functions.invoke("get-available-slots", { body: { estimateId: estimate.id, date } })
    setLoading(false)
    if (invokeError || data?.error) { setSlots([]); setError(data?.error || invokeError?.message || "Unable to load available times."); return }
    setSlots((data?.slots ?? []) as Slot[])
  }
  async function confirm() {
    if (!selected) return
    setSaving(true); setError("")
    try { await onConfirm(selected) }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to confirm this time slot.") }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">APPOINTMENT SELECTION</p><h2 className="mt-1 text-2xl font-bold">Choose a new available time</h2><p className="mt-1 text-sm text-slate-600">{estimate.estimate_number} · estimated duration {Number(estimate.estimated_duration_minutes || 0) / 60} h</p></div><button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">Close</button></div>{error && <Alert text={error} />}<label className="mt-6 block text-sm font-semibold">Date<input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={(e)=>setDate(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2"/></label><div className="mt-5"><p className="text-sm font-semibold">Available times</p>{loading ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : slots.length === 0 ? <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No time slots are available for this date. Choose another day.</p> : <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{slots.map((slot)=><button key={slot.startsAt} type="button" onClick={()=>setSelected(slot)} className={`rounded-lg border px-3 py-3 text-sm font-semibold ${selected?.startsAt===slot.startsAt?"border-blue-700 bg-blue-50 text-blue-800":"hover:border-blue-400"}`}>{slot.label}</button>)}</div>}</div><div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Important:</strong> Choose the appointment that works for you first. If the quote has not yet been accepted, the time slot will be confirmed when you sign electronically.</div><button type="button" onClick={()=>void confirm()} disabled={!selected || saving} className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving?"Confirming…":confirmLabel}</button></div></div>
}

function PortalHeader({ customer, onLogout }: { customer?: Customer | null; onLogout?: () => void }) { return <header className="border-b border-teal-100 bg-white/95 text-slate-800 shadow-sm backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Link to="/" className="font-bold tracking-wide"><span className="text-teal-600">OTTAWA</span> MULTISERVICES</Link><div className="flex items-center gap-3"><LanguageSwitcher compact />{customer && <span className="hidden text-sm text-slate-500 sm:inline"><UserRound className="mr-1 inline h-4 w-4" />{customer.email}</span>}{onLogout && <button onClick={onLogout} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800 hover:bg-teal-100"><LogOut className="mr-1 inline h-4 w-4" />Sign out</button>}</div></div></header> }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="mb-4 text-xl font-bold">{title}</h2>{children}</section> }
function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) { return <div className="rounded-xl border bg-white p-5"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div> }
function Badge({ status }: { status: string }) { return <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabel[status] ?? status}</span> }
function Empty() { return <div className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-500">Nothing here yet.</div> }
function Alert({ text }: { text: string }) { return <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{text}</div> }

