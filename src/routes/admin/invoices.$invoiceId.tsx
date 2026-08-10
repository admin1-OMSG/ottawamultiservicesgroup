import { FormEvent, useEffect, useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Printer, Send } from "lucide-react"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatCad, formatDate } from "@/features/admin/formatters"
import { sendCrmEmail } from "@/lib/email-notifications"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/invoices/$invoiceId")({ component: InvoiceDetail })

type Invoice = {
  id: string
  customer_id: string
  estimate_id: string | null
  job_id: string | null
  invoice_number: string
  title: string | null
  status: string
  issue_date: string
  due_date: string | null
  subtotal: number
  discount_total: number
  tax_rate: number
  tax_total: number
  total: number
  amount_paid: number
  balance_due: number
  currency: string
  notes: string | null
  terms: string | null
  customer: {
    first_name: string
    last_name: string | null
    email: string
    phone: string | null
    address_line: string | null
    city: string | null
    province: string | null
    postal_code: string | null
  } | null
}

type Item = { id: string; description: string; quantity: number; unit_price: number; line_total: number }
type Payment = { id: string; amount: number; payment_date: string; method: string; reference: string | null }

const BUSINESS_NAME = "Ottawa Multiservices Group Inc."
const BUSINESS_EMAIL = import.meta.env.VITE_BUSINESS_EMAIL || "admin1@ottawamultiservicesgroup.com"
const BUSINESS_PHONE = import.meta.env.VITE_BUSINESS_PHONE || ""
const BUSINESS_ADDRESS = import.meta.env.VITE_BUSINESS_ADDRESS || "Ottawa, Ontario, Canada"
const GST_HST_NUMBER = import.meta.env.VITE_GST_HST_NUMBER || ""
const WEBSITE = "www.ottawamultiservicesgroup.com"

const paymentMethodLabels: Record<string, string> = {
  etransfer: "Interac e-Transfer",
  credit_card: "Carte de crédit",
  debit_card: "Carte de débit",
  cash: "Comptant",
  cheque: "Chèque",
  bank_transfer: "Virement bancaire",
  other: "Autre",
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  overdue: "En retard",
  void: "Annulée",
}

function InvoiceDetail() {
  const { invoiceId } = Route.useParams()
  const nav = useNavigate()
  const [inv, setInv] = useState<Invoice | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("etransfer")
  const [reference, setReference] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [invoicePhotos, setInvoicePhotos] = useState<{id:string;url:string;caption:string|null}[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [customerJobs, setCustomerJobs] = useState<{id:string;job_number:string;title:string;status:string}[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")

  useEffect(() => { void load() }, [invoiceId])

  async function load() {
    try {
      if (!(await requireActiveAdmin())) { await nav({ to: "/admin/login" }); return }
      const [a, b, c] = await Promise.all([
        supabase.from("invoices").select("id,customer_id,estimate_id,job_id,invoice_number,title,status,issue_date,due_date,subtotal,discount_total,tax_rate,tax_total,total,amount_paid,balance_due,currency,notes,terms,customer:customers(first_name,last_name,email,phone,address_line,city,province,postal_code)").eq("id", invoiceId).single(),
        supabase.from("invoice_items").select("id,description,quantity,unit_price,line_total").eq("invoice_id", invoiceId).order("position"),
        supabase.from("payments").select("id,amount,payment_date,method,reference").eq("invoice_id", invoiceId).order("payment_date", { ascending: false }),
      ])
      if (a.error) throw a.error
      if (b.error) throw b.error
      if (c.error) throw c.error
      let invoice = a.data as unknown as Invoice
      if (!invoice.job_id && invoice.estimate_id) {
        const { data: linkedJob } = await supabase.from("jobs").select("id").eq("estimate_id", invoice.estimate_id).maybeSingle()
        if (linkedJob?.id) {
          await supabase.from("invoices").update({ job_id: linkedJob.id }).eq("id", invoice.id)
          invoice = { ...invoice, job_id: linkedJob.id }
        }
      }
      setInv(invoice)
      setSelectedJobId(invoice.job_id || "")
      setItems((b.data ?? []) as Item[])
      setPayments((c.data ?? []) as Payment[])
      const { data: jobs } = await supabase.from("jobs").select("id,job_number,title,status").eq("customer_id", invoice.customer_id).order("created_at", { ascending: false })
      setCustomerJobs((jobs ?? []) as {id:string;job_number:string;title:string;status:string}[])
      if (invoice.job_id) {
        const { data: photoRows } = await supabase.from("job_photos").select("id,storage_path,caption").eq("job_id", invoice.job_id).eq("kind","after").order("created_at")
        const signed = await Promise.all((photoRows ?? []).map(async (photo) => {
          const { data } = await supabase.storage.from("service-photos").createSignedUrl(photo.storage_path, 3600)
          return data?.signedUrl ? { id: photo.id, url: data.signedUrl, caption: photo.caption } : null
        }))
        setInvoicePhotos(signed.filter(Boolean) as {id:string;url:string;caption:string|null}[])
      } else {
        setInvoicePhotos([])
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible") }
  }

  async function linkJob() {
    if (!inv || !selectedJobId) return
    setError(""); setNotice("")
    const { error } = await supabase.from("invoices").update({ job_id: selectedJobId }).eq("id", inv.id)
    if (error) { setError(error.message); return }
    setNotice("Intervention liée à la facture.")
    await load()
  }

  async function uploadInvoicePhotos() {
    if (!inv?.job_id || photoFiles.length === 0) return
    setUploadingPhotos(true); setError(""); setNotice("")
    try {
      const user = await requireActiveAdmin(); if (!user) return
      for (const file of photoFiles.slice(0,10)) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} dépasse 8 Mo.`)
        if (!["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(file.type)) throw new Error(`${file.name}: format non supporté.`)
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
        const storagePath = `jobs/${inv.job_id}/after/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from("service-photos").upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const { error: rowError } = await supabase.from("job_photos").insert({ job_id: inv.job_id, kind: "after", storage_path: storagePath, caption: "Photo jointe à la facture", created_by: user.id })
        if (rowError) throw rowError
      }
      setPhotoFiles([])
      setNotice("Photos ajoutées. Elles seront visibles par le client avec la facture.")
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Téléversement impossible") }
    finally { setUploadingPhotos(false) }
  }

  async function sendInvoice() {
    if (!inv) return
    setSending(true); setError(""); setNotice("")
    try {
      const result = await sendCrmEmail({ type: "invoice_ready", invoiceId: inv.id })
      if (!result.ok) throw new Error(result.error)
      setNotice(Number(inv.balance_due) <= 0 ? "La facture acquittée a été envoyée au client." : "La facture a été envoyée au client.")
    } catch (e) { setError(e instanceof Error ? e.message : "Envoi impossible") }
    finally { setSending(false) }
  }

  async function addPayment(e: FormEvent) {
    e.preventDefault(); if (!inv) return
    const value = Number(amount)
    if (value <= 0 || value > Number(inv.balance_due)) { setError("Le montant doit être supérieur à 0 et ne pas dépasser le solde."); return }
    setSaving(true); setError(""); setNotice("")
    try {
      const user = await requireActiveAdmin(); if (!user) return
      const { error } = await supabase.from("payments").insert({ invoice_id: inv.id, amount: value, method, reference: reference || null, created_by: user.id })
      if (error) throw error
      const paid = Number(inv.amount_paid) + value
      const balance = Math.max(0, Number(inv.total) - paid)
      const status = balance === 0 ? "paid" : "partially_paid"
      const { error: u } = await supabase.from("invoices").update({ amount_paid: paid, balance_due: balance, status, updated_at: new Date().toISOString() }).eq("id", inv.id)
      if (u) throw u
      setAmount(""); setReference(""); setNotice("Paiement enregistré. Vous pouvez maintenant envoyer la facture mise à jour au client."); await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Paiement impossible") }
    finally { setSaving(false) }
  }

  const primaryPaymentMethod = useMemo(() => {
    if (payments.length === 0) return "—"
    const distinct = [...new Set(payments.map((p) => paymentMethodLabels[p.method] ?? p.method))]
    return distinct.join(" + ")
  }, [payments])

  if (!inv) return <p>Chargement…</p>
  const paid = Number(inv.balance_due) <= 0
  const taxRatePercent = Number(inv.tax_rate || 0) * 100
  const customerAddress = inv.customer ? [inv.customer.address_line, inv.customer.city, inv.customer.province, inv.customer.postal_code].filter(Boolean).join(", ") : ""

  return <div className="space-y-6">
    <header className="print:hidden">
      <Link to="/admin/invoices" className="text-sm font-semibold text-blue-700">← Retour aux factures</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">{inv.invoice_number}</h1><p className="text-slate-600">{inv.title}</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold"><Printer className="mr-2 h-4 w-4" />Imprimer / PDF</button>
          <button type="button" onClick={sendInvoice} disabled={sending || !inv.customer?.email} className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send className="mr-2 h-4 w-4" />{sending ? "Envoi…" : paid ? "Envoyer la facture acquittée" : "Envoyer la facture"}</button>
        </div>
      </div>
    </header>

    {error && <div className="print:hidden rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div className="print:hidden rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{notice}</div>}

    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="bg-slate-950 px-7 py-7 text-white print:bg-white print:px-0 print:py-0 print:text-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400 print:text-slate-600">OTTAWA MULTISERVICES</p>
            <h2 className="mt-2 text-2xl font-bold">{BUSINESS_NAME}</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-300 print:text-slate-600">
              <p>{BUSINESS_ADDRESS}</p>
              <p>{BUSINESS_EMAIL}{BUSINESS_PHONE ? ` · ${BUSINESS_PHONE}` : ""}</p>
              <p>{WEBSITE}</p>
              {GST_HST_NUMBER && <p>GST/HST No. {GST_HST_NUMBER}</p>}
            </div>
          </div>
          <div className="min-w-[220px] text-left sm:text-right">
            <p className="text-3xl font-black tracking-tight">FACTURE</p>
            <p className="mt-2 text-lg font-bold">{inv.invoice_number}</p>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{paid ? "ACQUITTÉE" : statusLabels[inv.status] ?? inv.status}</span>
          </div>
        </div>
      </div>

      <div className="p-7 print:px-0">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Facturé à</p>
            <p className="mt-2 text-lg font-bold">{inv.customer ? `${inv.customer.first_name} ${inv.customer.last_name ?? ""}`.trim() : "—"}</p>
            {customerAddress && <p className="mt-1 text-sm text-slate-600">{customerAddress}</p>}
            <p className="mt-1 text-sm text-slate-600">{inv.customer?.email}</p>
            {inv.customer?.phone && <p className="mt-1 text-sm text-slate-600">{inv.customer.phone}</p>}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm print:border print:bg-white">
            <span className="text-slate-500">Date d’émission</span><strong className="text-right">{formatDate(inv.issue_date)}</strong>
            <span className="text-slate-500">Date d’échéance</span><strong className="text-right">{inv.due_date ? formatDate(inv.due_date) : "—"}</strong>
            <span className="text-slate-500">Devise</span><strong className="text-right">{inv.currency || "CAD"}</strong>
            <span className="text-slate-500">Mode de paiement</span><strong className="text-right">{primaryPaymentMethod}</strong>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Qté</th><th className="px-4 py-3 text-right">Prix unitaire</th><th className="px-4 py-3 text-right">Montant</th></tr></thead>
            <tbody className="divide-y">{items.map((x) => <tr key={x.id}><td className="px-4 py-4">{x.description}</td><td className="px-4 py-4 text-right">{x.quantity}</td><td className="px-4 py-4 text-right">{formatCad(x.unit_price)}</td><td className="px-4 py-4 text-right font-semibold">{formatCad(x.line_total)}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_330px]">
          <div>
            <h3 className="font-bold">Paiement</h3>
            {payments.length === 0 ? <p className="mt-2 text-sm text-slate-500">Aucun paiement enregistré.</p> : <div className="mt-3 overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Méthode</th><th className="px-3 py-2 text-left">Référence</th><th className="px-3 py-2 text-right">Montant</th></tr></thead><tbody className="divide-y">{payments.map((p) => <tr key={p.id}><td className="px-3 py-3">{formatDate(p.payment_date)}</td><td className="px-3 py-3">{paymentMethodLabels[p.method] ?? p.method}</td><td className="px-3 py-3">{p.reference || "—"}</td><td className="px-3 py-3 text-right font-semibold">{formatCad(p.amount)}</td></tr>)}</tbody></table></div>}
          </div>

          <div className="rounded-xl border bg-slate-50 p-5 print:bg-white">
            <p className="flex justify-between py-1.5"><span>Sous-total avant taxes</span><strong>{formatCad(inv.subtotal)}</strong></p>
            {Number(inv.discount_total) > 0 && <p className="flex justify-between py-1.5 text-slate-600"><span>Remise</span><strong>-{formatCad(inv.discount_total)}</strong></p>}
            <p className="flex justify-between py-1.5"><span>HST ({taxRatePercent.toFixed(taxRatePercent % 1 === 0 ? 0 : 2)} %)</span><strong>{formatCad(inv.tax_total)}</strong></p>
            <p className="mt-2 flex justify-between border-t pt-3 text-lg"><span>Total</span><strong>{formatCad(inv.total)}</strong></p>
            <p className="mt-2 flex justify-between text-emerald-700"><span>Montant payé</span><strong>{formatCad(inv.amount_paid)}</strong></p>
            <p className="mt-3 flex justify-between border-t pt-3 text-xl"><span>Solde à payer</span><strong>{formatCad(inv.balance_due)}</strong></p>
          </div>
        </div>

        <div className="mt-7 rounded-xl border p-5 print:hidden">
          <h3 className="font-bold">Photos du travail terminé</h3>
          <p className="mt-1 text-sm text-slate-500">Ajoutez ici les photos après l’intervention. Elles apparaîtront dans le portail client avec cette facture.</p>
          {!inv.job_id ? <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Cette facture n’est pas encore liée à une intervention.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select value={selectedJobId} onChange={(e)=>setSelectedJobId(e.target.value)} className="flex-1 rounded-lg border bg-white px-3 py-2">
                <option value="">Choisir une intervention</option>
                {customerJobs.map((j)=><option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>)}
              </select>
              <button type="button" onClick={()=>void linkJob()} disabled={!selectedJobId} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Lier</button>
            </div>
          </div> : <>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={(e)=>setPhotoFiles(Array.from(e.target.files ?? []).slice(0,10))} className="mt-4 block w-full text-sm" />
            <button type="button" onClick={()=>void uploadInvoicePhotos()} disabled={uploadingPhotos || photoFiles.length===0} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{uploadingPhotos ? "Ajout…" : `Ajouter ${photoFiles.length || ""} photo(s)`}</button>
            {invoicePhotos.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{invoicePhotos.map((photo)=><a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border"><img src={photo.url} alt={photo.caption ?? "Travail terminé"} className="h-40 w-full object-cover"/><div className="p-2 text-xs font-medium">Après travaux</div></a>)}</div>}
          </>}
        </div>

        {(inv.notes || inv.terms) && <div className="mt-7 grid gap-5 md:grid-cols-2">{inv.notes && <div className="rounded-xl border p-4"><h3 className="font-bold">Notes</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{inv.notes}</p></div>}{inv.terms && <div className="rounded-xl border p-4"><h3 className="font-bold">Conditions de paiement</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{inv.terms}</p></div>}</div>}

        <p className="mt-7 border-t pt-4 text-xs text-slate-500">Merci d’avoir choisi {BUSINESS_NAME}. Conservez cette facture pour vos dossiers.</p>
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-[1fr_340px] print:hidden">
      <div />
      <aside className="space-y-6">
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><h2 className="font-bold text-blue-950">Envoi au client</h2><p className="mt-2 text-sm text-blue-800">{paid ? "Envoyez la facture acquittée et la confirmation de paiement au client." : "Envoyez la facture au client par courriel. Elle sera également disponible dans son espace client."}</p><button type="button" onClick={sendInvoice} disabled={sending || !inv.customer?.email} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{sending ? "Envoi…" : paid ? "Envoyer la facture acquittée" : "Envoyer la facture"}</button></section>
        {Number(inv.balance_due) > 0 && <form onSubmit={addPayment} className="rounded-xl border bg-white p-5"><h2 className="font-bold">Enregistrer un paiement</h2><label className="mt-4 block text-sm">Montant<input required type="number" min=".01" max={inv.balance_due} step=".01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="mt-3 block text-sm">Méthode<select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="etransfer">Interac e-Transfer</option><option value="credit_card">Carte de crédit</option><option value="debit_card">Carte de débit</option><option value="cash">Comptant</option><option value="cheque">Chèque</option><option value="bank_transfer">Virement bancaire</option><option value="other">Autre</option></select></label><label className="mt-3 block text-sm">Référence<input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><button disabled={saving} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white">{saving ? "Enregistrement…" : "Ajouter le paiement"}</button></form>}
      </aside>
    </div>
  </div>
}
