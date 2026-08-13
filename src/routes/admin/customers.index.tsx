import { useEffect, useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Search, UserPlus } from "lucide-react"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatDate } from "@/features/admin/formatters"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/customers/")({ component: CustomersPage })

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  city: string | null
  status: string | null
  created_at: string
}

function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => { void loadCustomers() }, [])

  async function loadCustomers() {
    setLoading(true); setError("")
    try {
      if (!(await requireActiveAdmin())) { await navigate({ to: "/admin/login" }); return }
      const { data, error: queryError } = await supabase
        .from("customers")
        .select("id, first_name, last_name, email, phone, city, status, created_at")
        .order("created_at", { ascending: false })
      if (queryError) throw queryError
      setCustomers((data ?? []) as Customer[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load customers.")
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return customers
    return customers.filter((customer) => [customer.first_name, customer.last_name, customer.email, customer.phone, customer.city]
      .filter(Boolean).join(" ").toLowerCase().includes(value))
  }, [customers, search])

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-emerald-700">CRM</p><h1 className="text-3xl font-bold text-slate-950">Customers</h1><p className="mt-1 text-slate-600">Customer contact information and business history.</p></div>
      <Link to="/admin/customers/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700"><UserPlus className="h-4 w-4" /> New Customer</Link>
    </header>

    <section className="grid gap-4 sm:grid-cols-3">
      <Metric label="Customers" value={customers.length} />
      <Metric label="Actives" value={customers.filter((c) => c.status !== "archived").length} />
      <Metric label="Nouveaux ce mois" value={customers.filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth() && new Date(c.created_at).getFullYear() === new Date().getFullYear()).length} />
    </section>

    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <label htmlFor="customer-search" className="text-sm font-medium text-slate-700">Search customers</label>
      <div className="relative mt-2"><Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><input id="customer-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, phone or city" className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></div>
    </section>

    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {loading ? <p className="p-8 text-slate-600">Loading customers…</p> : filtered.length === 0 ? <p className="p-8 text-center text-slate-500">No customers found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-100 text-sm text-slate-700"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Since</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{filtered.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-4 py-4"><p className="font-semibold text-slate-900">{customer.first_name} {customer.last_name ?? ""}</p><p className="text-sm text-slate-500">{customer.email}</p></td><td className="px-4 py-4">{customer.phone ?? "—"}</td><td className="px-4 py-4">{customer.city ?? "—"}</td><td className="px-4 py-4 text-sm text-slate-600">{formatDate(customer.created_at)}</td><td className="px-4 py-4"><Link to="/admin/customers/$customerId" params={{ customerId: customer.id }} className="font-semibold text-blue-700 hover:underline">Open</Link></td></tr>)}</tbody></table></div>}
    </section>
  </div>
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></article> }
