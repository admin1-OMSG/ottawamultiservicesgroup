import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  CircleDollarSign,
  Handshake,
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  TrendingUp,
  Megaphone,
  UserRound,
  Users,
  MessageCircleMore,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const mainNavigation = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Quote Requests", to: "/admin/quotes", icon: ClipboardList },
  { label: "Quotes", to: "/admin/estimates", icon: ReceiptText },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Jobs", to: "/admin/jobs", icon: FileText },
  { label: "Schedule", to: "/admin/schedule", icon: CalendarDays },
  { label: "Employees", to: "/admin/employees", icon: UserRound },
  { label: "Invoices", to: "/admin/invoices", icon: FileText },
  { label: "Payments", to: "/admin/payments", icon: ReceiptText },
  { label: "Finance", to: "/admin/finance", icon: CircleDollarSign },
  { label: "Reports", to: "/admin/reports", icon: TrendingUp },
  { label: "Inbox", to: "/admin/inbox", icon: MessageCircleMore },
  { label: "Marketing", to: "/admin/marketing", icon: Megaphone },
  { label: "Settings", to: "/admin/settings", icon: Settings },
  { label: "Partners", to: "/admin/partners", icon: Handshake },
  { label: "Careers", to: "/admin/careers", icon: BriefcaseBusiness },
  { label: "Inventory", to: "/admin/inventory", icon: Package },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps = {}) {
  const navigate = useNavigate();
  async function logout() {
    onNavigate?.();
    await supabase.auth.signOut();
    await navigate({ to: "/admin/login" });
  }

  return (
    <aside
      className={cn(
        "flex min-h-screen w-64 flex-col border-r border-teal-100 bg-white text-slate-800 shadow-[8px_0_30px_-28px_rgba(13,148,136,.55)]",
        className,
      )}
    >
      <div className="shrink-0 border-b border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
          Ottawa Multiservices
        </p>
        <h1 className="mt-2 text-xl font-bold">Admin CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Version 2.5</p>
      </div>
      <nav
        aria-label="Admin navigation"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-6"
      >
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-teal-700/70">
            Management
          </p>
          <div className="space-y-1">
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => onNavigate?.()}
                  activeOptions={{ exact: item.exact }}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  activeProps={{
                    className:
                      "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm hover:brightness-105",
                  }}
                  inactiveProps={{
                    className: "text-slate-600 hover:bg-teal-50 hover:text-teal-800",
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <div className="shrink-0 border-t border-teal-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href="tel:+16134076699"
          className="mb-2 block px-3 text-xs font-semibold text-slate-400 hover:text-teal-600"
        >
          (613) 407-6699
        </a>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
