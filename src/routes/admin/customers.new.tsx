import { FormEvent, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/customers/new")({ component: NewCustomerPage })

function NewCustomerPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", address_line: "", city: "Ottawa", province: "ON", postal_code: "", internal_notes: "" })

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try {
      if (!(await requireActiveAdmin())) { await navigate({ to: "/admin/login" }); return }
      const { data, error: insertError } = await supabase.from("customers").insert({ ...form, last_name: form.last_name || null, phone: form.phone || null, address_line: form.address_line || null, postal_code: form.postal_code || null, internal_notes: form.internal_notes || null, status: "active" }).select("id").single()
      if (insertError) throw insertError
      await navigate({ to: "/admin/customers/$customerId", params: { customerId: data.id } })
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create customer.") } finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-3xl space-y-6"><header><Link to="/admin/customers" className="text-sm font-semibold text-blue-700 hover:underline">← Back to customers</Link><h1 className="mt-2 text-3xl font-bold text-slate-950">New Customer</h1></header>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}<form onSubmit={submit} className="rounded-xl border bg-white p-6 shadow-sm"><div className="grid gap-5 sm:grid-cols-2"><Field label="First name *" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required /><Field label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} /><Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required /><Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /><div className="sm:col-span-2"><Field label="Address" value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} /></div><Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} /><Field label="Province" value={form.province} onChange={(v) => setForm({ ...form, province: v })} /><Field label="Postal code" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} /><div className="sm:col-span-2"><label className="text-sm font-medium text-slate-700">Internal Notes</label><textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></div></div><div className="mt-6 flex justify-end gap-3"><Link to="/admin/customers" className="rounded-lg border px-4 py-2 font-medium">Annuler</Link><button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : "Create Customer"}</button></div></form></div>
}
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-medium text-slate-700">{label}<input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label> }
