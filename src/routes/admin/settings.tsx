import { FormEvent, useEffect, useState, type ReactNode } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Building2, CalendarClock, ReceiptText, Save, Settings2 } from "lucide-react"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage })

type AppSettings = {
  id: number
  company_name: string
  public_email: string
  public_phone: string
  website_url: string
  address_line: string | null
  city: string
  province: string
  postal_code: string | null
  country: string
  gst_hst_number: string | null
  default_tax_rate: number
  default_currency: string
  default_quote_valid_days: number
  default_quote_terms: string
  default_invoice_terms: string
  default_language: "en" | "fr"
  timezone: string
}

type BusinessHour = {
  id: string
  day_of_week: number
  is_open: boolean
  opens_at: string
  closes_at: string
  slot_interval_minutes: number
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { void load() }, [])

  async function load() {
    try {
      setError("")
      if (!(await requireActiveAdmin())) { await navigate({ to: "/admin/login" }); return }
      const [settingsResult, hoursResult] = await Promise.all([
        supabase.from("app_settings").select("*").eq("id", 1).single(),
        supabase.from("business_hours").select("id,day_of_week,is_open,opens_at,closes_at,slot_interval_minutes").order("day_of_week"),
      ])
      if (settingsResult.error) throw settingsResult.error
      if (hoursResult.error) throw hoursResult.error
      setSettings(settingsResult.data as AppSettings)
      setHours((hoursResult.data ?? []) as BusinessHour[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load settings.")
    } finally {
      setLoading(false)
    }
  }

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current)
  }

  function updateHour(day: number, patch: Partial<BusinessHour>) {
    setHours((current) => current.map((row) => row.day_of_week === day ? { ...row, ...patch } : row))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const user = await requireActiveAdmin()
      if (!user) { await navigate({ to: "/admin/login" }); return }
      const { id: _id, ...payload } = settings
      const { error: settingsError } = await supabase.from("app_settings").update({ ...payload, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", 1)
      if (settingsError) throw settingsError
      for (const row of hours) {
        const { error: hourError } = await supabase.from("business_hours").update({ is_open: row.is_open, opens_at: row.opens_at, closes_at: row.closes_at, slot_interval_minutes: row.slot_interval_minutes, updated_at: new Date().toISOString() }).eq("id", row.id)
        if (hourError) throw hourError
      }
      setSuccess("Settings saved successfully.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save settings.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="rounded-xl border bg-white p-6">Loading settings…</div>
  if (!settings) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">Settings could not be loaded.</div>

  return <form onSubmit={save} className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-emerald-700">Administration</p><h1 className="text-3xl font-bold">Settings</h1><p className="mt-1 text-slate-600">Centralize your company, billing, quote and scheduling defaults.</p></div>
      <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save settings"}</button>
    </header>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{success}</div>}

    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-emerald-600"/><div><h2 className="text-lg font-bold">Company profile</h2><p className="text-sm text-slate-500">Public information used by your business.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Company name"><input value={settings.company_name} onChange={e=>setField("company_name",e.target.value)} className="input" required/></Field>
        <Field label="Public email"><input type="email" value={settings.public_email} onChange={e=>setField("public_email",e.target.value)} className="input" required/></Field>
        <Field label="Public phone"><input value={settings.public_phone} onChange={e=>setField("public_phone",e.target.value)} className="input" required/></Field>
        <Field label="Website"><input value={settings.website_url} onChange={e=>setField("website_url",e.target.value)} className="input"/></Field>
        <Field label="Street address"><input value={settings.address_line ?? ""} onChange={e=>setField("address_line",e.target.value || null)} className="input"/></Field>
        <Field label="City"><input value={settings.city} onChange={e=>setField("city",e.target.value)} className="input"/></Field>
        <Field label="Province"><input value={settings.province} onChange={e=>setField("province",e.target.value)} className="input"/></Field>
        <Field label="Postal code"><input value={settings.postal_code ?? ""} onChange={e=>setField("postal_code",e.target.value || null)} className="input"/></Field>
      </div>
    </section>

    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-emerald-600"/><div><h2 className="text-lg font-bold">Billing & tax</h2><p className="text-sm text-slate-500">Defaults used when creating financial documents.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="GST/HST number"><input value={settings.gst_hst_number ?? ""} onChange={e=>setField("gst_hst_number",e.target.value || null)} className="input" placeholder="Optional"/></Field>
        <Field label="Default tax rate (%)"><input type="number" min="0" max="100" step="0.01" value={(Number(settings.default_tax_rate)*100).toString()} onChange={e=>setField("default_tax_rate",Math.max(0,Number(e.target.value))/100)} className="input"/></Field>
        <Field label="Currency"><select value={settings.default_currency} onChange={e=>setField("default_currency",e.target.value)} className="input"><option value="CAD">CAD</option><option value="USD">USD</option></select></Field>
        <Field label="Default language"><select value={settings.default_language} onChange={e=>setField("default_language",e.target.value as "en"|"fr")} className="input"><option value="en">English</option><option value="fr">Français</option></select></Field>
      </div>
      <Field label="Default invoice terms" className="mt-4"><textarea rows={3} value={settings.default_invoice_terms} onChange={e=>setField("default_invoice_terms",e.target.value)} className="input"/></Field>
    </section>

    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-emerald-600"/><div><h2 className="text-lg font-bold">Quote defaults</h2><p className="text-sm text-slate-500">These defaults are applied when a new quote is created.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
        <Field label="Quote validity (days)"><input type="number" min="1" max="365" value={settings.default_quote_valid_days} onChange={e=>setField("default_quote_valid_days",Number(e.target.value))} className="input"/></Field>
        <Field label="Default quote terms"><textarea rows={3} value={settings.default_quote_terms} onChange={e=>setField("default_quote_terms",e.target.value)} className="input"/></Field>
      </div>
    </section>

    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-emerald-600"/><div><h2 className="text-lg font-bold">Business hours & booking</h2><p className="text-sm text-slate-500">Controls the slots offered to customers.</p></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Day</th><th className="px-3 py-2 text-left">Open</th><th className="px-3 py-2 text-left">From</th><th className="px-3 py-2 text-left">To</th><th className="px-3 py-2 text-left">Slot interval</th></tr></thead><tbody className="divide-y">{hours.map(row=><tr key={row.id}><td className="px-3 py-3 font-semibold">{dayNames[row.day_of_week]}</td><td className="px-3 py-3"><input type="checkbox" checked={row.is_open} onChange={e=>updateHour(row.day_of_week,{is_open:e.target.checked})} className="h-4 w-4"/></td><td className="px-3 py-3"><input type="time" disabled={!row.is_open} value={row.opens_at.slice(0,5)} onChange={e=>updateHour(row.day_of_week,{opens_at:e.target.value})} className="rounded-lg border px-3 py-2 disabled:bg-slate-100"/></td><td className="px-3 py-3"><input type="time" disabled={!row.is_open} value={row.closes_at.slice(0,5)} onChange={e=>updateHour(row.day_of_week,{closes_at:e.target.value})} className="rounded-lg border px-3 py-2 disabled:bg-slate-100"/></td><td className="px-3 py-3"><select disabled={!row.is_open} value={row.slot_interval_minutes} onChange={e=>updateHour(row.day_of_week,{slot_interval_minutes:Number(e.target.value)})} className="rounded-lg border px-3 py-2 disabled:bg-slate-100"><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option></select></td></tr>)}</tbody></table></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Timezone"><select value={settings.timezone} onChange={e=>setField("timezone",e.target.value)} className="input"><option value="America/Toronto">America/Toronto (Eastern)</option></select></Field></div>
    </section>
  </form>
}

function Field({ label, children, className="" }: { label:string; children:ReactNode; className?:string }) { return <label className={`block text-sm font-medium text-slate-700 ${className}`}>{label}<div className="mt-1">{children}</div></label> }
