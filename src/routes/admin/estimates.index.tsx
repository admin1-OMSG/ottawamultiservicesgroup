import { useEffect, useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { FilePlus2, Search, Trash2 } from "lucide-react"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatCad, formatDate } from "@/features/admin/formatters"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/estimates/")({ component: EstimatesPage })

type Estimate = { id: string; estimate_number: string; status: string; total: number; valid_until: string | null; created_at: string; customer: { first_name: string; last_name: string | null; email: string } | null }
const statusLabels: Record<string, string> = { draft: "Draft", pending_review: "Pending review", sent: "Sent", viewed: "Viewed", accepted: "Accepted", rejected: "Rejected", expired: "Expired", cancelled: "Cancelled", converted_to_job: "Converted to job" }

function EstimatesPage() {
  const navigate = useNavigate(); const [estimates, setEstimates] = useState<Estimate[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all")
  useEffect(() => { void load() }, [])
  async function deleteEstimate(estimate: Estimate) {
    setError("")
    try {
      if (!(await requireActiveAdmin())) { await navigate({ to: "/admin/login" }); return }
      const [jobsResult, invoicesResult] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("estimate_id", estimate.id),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("estimate_id", estimate.id),
      ])
      const failed = [jobsResult, invoicesResult].find((result) => result.error)
      if (failed?.error) throw failed.error
      const linkedJobs = jobsResult.count ?? 0
      const linkedInvoices = invoicesResult.count ?? 0
      const linkedNote = linkedJobs || linkedInvoices
        ? ` ${linkedJobs} job(s) and ${linkedInvoices} invoice(s) are linked to this quote; they will be kept but detached from it.`
        : ""
      if (!window.confirm(`Delete quote ${estimate.estimate_number}?${linkedNote} Quote items, signature and reserved appointment will also be deleted. This action cannot be undone.`)) return
      const { error: deleteError } = await supabase.from("estimates").delete().eq("id", estimate.id)
      if (deleteError) throw deleteError
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete quote.")
    }
  }
  async function load() { setLoading(true); setError(""); try { if (!(await requireActiveAdmin())) { await navigate({ to: "/admin/login" }); return } const { data, error: queryError } = await supabase.from("estimates").select("id, estimate_number, status, total, valid_until, created_at, customer:customers(first_name,last_name,email)").order("created_at", { ascending: false }); if (queryError) throw queryError; setEstimates((data ?? []) as unknown as Estimate[]) } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load quotes.") } finally { setLoading(false) } }
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return estimates.filter((e) => { const text = [e.estimate_number, e.customer?.first_name, e.customer?.last_name, e.customer?.email].filter(Boolean).join(" ").toLowerCase(); return (!q || text.includes(q)) && (status === "all" || e.status === status) }) }, [estimates, search, status])
  return <div className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-emerald-700">Sales</p><h1 className="text-3xl font-bold text-slate-950">Quotes</h1><p className="mt-1 text-slate-600">Create, price, and track quotes sent to customers.</p></div><Link to="/admin/estimates/new" search={{ customerId: undefined }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white"><FilePlus2 className="h-4 w-4" /> New Quote</Link></header><section className="grid gap-4 sm:grid-cols-3"><Metric label="Total" value={estimates.length} /><Metric label="Drafts" value={estimates.filter((e) => e.status === "draft").length} /><Metric label="Accepted" value={estimates.filter((e) => e.status === "accepted").length} /></section><section className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-[1fr_240px]"><label className="text-sm font-medium text-slate-700">Search<div className="relative mt-1"><Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border py-2 pl-10 pr-3" placeholder="Number, name or email" /></div></label><label className="text-sm font-medium text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></section>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}<section className="overflow-hidden rounded-xl border bg-white shadow-sm">{loading ? <p className="p-8 text-slate-600">Loading quotes…</p> : filtered.length === 0 ? <p className="p-8 text-center text-slate-500">No quotes found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className="bg-slate-100 text-sm"><tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{filtered.map((e) => <tr key={e.id} className="hover:bg-slate-50"><td className="px-4 py-4 font-semibold">{e.estimate_number}</td><td className="px-4 py-4"><p className="font-medium">{e.customer ? `${e.customer.first_name} ${e.customer.last_name ?? ""}` : "Customer deleted"}</p><p className="text-sm text-slate-500">{e.customer?.email ?? "—"}</p></td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabels[e.status] ?? e.status}</span></td><td className="px-4 py-4 font-bold">{formatCad(e.total)}</td><td className="px-4 py-4 text-sm text-slate-600">{formatDate(e.created_at)}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><Link to="/admin/estimates/$estimateId" params={{ estimateId: e.id }} className="font-semibold text-blue-700 hover:underline">Open</Link><button type="button" onClick={()=>void deleteEstimate(e)} className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"><Trash2 className="h-4 w-4"/>Delete</button></div></td></tr>)}</tbody></table></div>}</section></div>
}
function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article> }
