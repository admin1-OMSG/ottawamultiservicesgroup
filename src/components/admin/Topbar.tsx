import type { ReactNode } from "react";
import { Bell, Search, Phone } from "lucide-react";

type TopbarProps = {
  menuTrigger?: ReactNode;
};

export function Topbar({ menuTrigger }: TopbarProps = {}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-teal-100 bg-white/95 px-3 shadow-sm backdrop-blur-xl sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {menuTrigger}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-lg">
            <span className="sm:hidden">OMSG Admin</span>
            <span className="hidden sm:inline">Ottawa Multiservices CRM</span>
          </h2>

          <p className="hidden truncate text-sm text-slate-500 sm:block">
            Manage quotes, customers and operations
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <a
          href="tel:+16134076699"
          className="hidden xl:inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700"
        >
          <Phone className="h-4 w-4" />
          (613) 407-6699
        </a>
        <div className="relative hidden 2xl:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            placeholder="Search..."
            className="h-10 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:gap-3 sm:pl-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 text-sm font-bold text-teal-700">
            AL
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-900">Abdellaziz Lhouss</p>

            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
