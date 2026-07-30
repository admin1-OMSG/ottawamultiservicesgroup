import { Link, useNavigate } from "@tanstack/react-router"
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

const mainNavigation = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Demandes de devis", to: "/admin/quotes", icon: ClipboardList },
  { label: "Devis officiels", to: "/admin/estimates", icon: ReceiptText },
  { label: "Clients", to: "/admin/customers", icon: Users },
]

const futureNavigation = [
  { label: "Partners", icon: Handshake },
  { label: "Schedule", icon: CalendarDays },
  { label: "Employees", icon: UserRound },
  { label: "Invoices", icon: FileText },
  { label: "Inventory", icon: Package },
  { label: "Reports", icon: TrendingUp },
  { label: "Settings", icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()
  async function logout() { await supabase.auth.signOut(); await navigate({ to: "/admin/login" }) }

  return <aside className="flex min-h-screen w-64 flex-col border-r border-slate-200 bg-slate-950 text-white">
    <div className="border-b border-slate-800 px-6 py-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Ottawa Multiservices</p><h1 className="mt-2 text-xl font-bold">Admin CRM</h1><p className="mt-1 text-sm text-slate-400">Version 0.2</p></div>
    <nav className="flex-1 space-y-6 px-3 py-6"><div><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Management</p><div className="space-y-1">{mainNavigation.map((item) => { const Icon = item.icon; return <Link key={item.label} to={item.to} activeOptions={{ exact: item.exact }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors" activeProps={{ className: "bg-emerald-500 text-white shadow-sm hover:bg-emerald-500" }} inactiveProps={{ className: "text-slate-300 hover:bg-slate-800 hover:text-white" }}><Icon className="h-5 w-5" /><span>{item.label}</span></Link> })}</div></div><div><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Coming soon</p><div className="space-y-1">{futureNavigation.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600"><Icon className="h-5 w-5" /><span>{item.label}</span><span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Soon</span></button> })}</div></div></nav>
    <div className="border-t border-slate-800 p-3"><button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400"><LogOut className="h-5 w-5" /><span>Logout</span></button></div>
  </aside>
}
