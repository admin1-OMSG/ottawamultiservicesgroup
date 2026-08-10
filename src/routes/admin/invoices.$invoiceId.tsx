import { FormEvent, useEffect, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatCad, formatDate } from "@/features/admin/formatters"
import { sendCrmEmail } from "@/lib/email-notifications"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/invoices/$invoiceId")({ component: InvoiceDetail })

type Invoice = {
  id: string
  invoice_number: string
  title: string | null
  status: string
  issue_date: string
  due_date: string | null
  subtotal: number
  tax_total: number
  total: number
  amount_paid: number
  balance_due: number
  notes: string | null
  customer: { first_name: string; last_name: string | null; email: string; phone: string | null } | null
}
type Item = { id: string; description: string; quantity: number; unit_price: number; line_total: number }
type Payment = { id: string; amount: number; payment_date: string; method: string; reference: string | null }

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

  useEffect(() => { void load() }, [invoiceId])

  async function load() {
    try {
      if (!(await requireActiveAdmin())) { await nav({ to: "/admin/login" }); return }
      const [a, b, c] = await Promise.all([
        supabase.from("invoices").select("id,invoice_number,title,status,issue_date,due_date,subtotal,tax_total,total,amount_paid,balance_due,notes,customer:customers(first_name,last_name,email,phone)").eq("id", invoiceId).single(),
        supabase.from("invoice_items").select("id,description,quantity,unit_price,line_total").eq("invoice_id", invoiceId).order("position"),
        supabase.from("payments").select("id,amount,payment_date,method,reference").eq("invoice_id", invoiceId).order("payment_date", { ascending: false }),
      ])
      if (a.error) throw a.error
      setInv(a.data as unknown as Invoice)
      setItems((b.data ?? []) as Item[])
      setPayments((c.data ?? []) as Payment[])
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible") }
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

  if (!inv) return <p>Chargement…</p>
  const paid = Number(inv.balance_due) <= 0

  return <div className="space-y-6">
    <header><Link to="/admin/invoices" className="text-sm font-semibold text-blue-700">← Retour aux factures</Link><h1 className="mt-2 text-3xl font-bold">{inv.invoice_number}</h1><p className="text-slate-600">{inv.title}</p></header>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{notice}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Client</h2><p className="mt-3">{inv.customer ? `${inv.customer.first_name} ${inv.customer.last_name ?? ""}` : "—"}</p><p className="text-sm text-slate-500">{inv.customer?.email}</p></section>
        <section className="overflow-hidden rounded-xl border bg-white"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Qté</th><th className="px-4 py-3 text-right">Prix</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y">{items.map(x => <tr key={x.id}><td className="px-4 py-4">{x.description}</td><td className="px-4 py-4 text-right">{x.quantity}</td><td className="px-4 py-4 text-right">{formatCad(x.unit_price)}</td><td className="px-4 py-4 text-right font-semibold">{formatCad(x.line_total)}</td></tr>)}</tbody></table></section>
        <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Historique des paiements</h2>{payments.length === 0 ? <p className="mt-3 text-slate-500">Aucun paiement.</p> : <div className="mt-3 divide-y">{payments.map(p => <div key={p.id} className="flex justify-between py-3"><div><p className="font-medium">{p.method}</p><p className="text-xs text-slate-500">{formatDate(p.payment_date)} {p.reference && `· ${p.reference}`}</p></div><b>{formatCad(p.amount)}</b></div>)}</div>}</section>
      </div>
      <aside className="space-y-6">
        <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Total</h2><p className="mt-4 flex justify-between"><span>Total</span><b>{formatCad(inv.total)}</b></p><p className="mt-2 flex justify-between text-emerald-700"><span>Payé</span><b>{formatCad(inv.amount_paid)}</b></p><p className="mt-3 flex justify-between border-t pt-3 text-xl"><span>Solde</span><b>{formatCad(inv.balance_due)}</b></p><p className="mt-4 text-xs text-slate-500">Émise le {formatDate(inv.issue_date)} · Échéance {formatDate(inv.due_date)}</p></section>
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><h2 className="font-bold text-blue-950">Envoi au client</h2><p className="mt-2 text-sm text-blue-800">{paid ? "Envoyez la facture acquittée et la confirmation de paiement au client." : "Envoyez la facture au client par courriel. Elle sera également disponible dans son espace client."}</p><button type="button" onClick={sendInvoice} disabled={sending || !inv.customer?.email} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Envoi…" : paid ? "Envoyer la facture acquittée" : "Envoyer la facture"}</button></section>
        {Number(inv.balance_due) > 0 && <form onSubmit={addPayment} className="rounded-xl border bg-white p-5"><h2 className="font-bold">Enregistrer un paiement</h2><label className="mt-4 block text-sm">Montant<input required type="number" min=".01" max={inv.balance_due} step=".01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="mt-3 block text-sm">Méthode<select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="etransfer">Interac e-Transfer</option><option value="credit_card">Carte de crédit</option><option value="debit_card">Carte de débit</option><option value="cash">Comptant</option><option value="cheque">Chèque</option><option value="bank_transfer">Virement bancaire</option><option value="other">Autre</option></select></label><label className="mt-3 block text-sm">Référence<input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><button disabled={saving} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white">{saving ? "Enregistrement…" : "Ajouter le paiement"}</button></form>}
      </aside>
    </div>
  </div>
}
