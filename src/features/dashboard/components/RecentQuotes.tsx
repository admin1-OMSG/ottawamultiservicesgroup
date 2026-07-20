import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  UserRound,
} from "lucide-react"

import type {
  QuoteStatus,
  RecentQuote,
} from "../types"

type RecentQuotesProps = {
  quotes: RecentQuote[]
}

const statusLabels: Record<QuoteStatus, string> = {
  new: "New",
  contacted: "Contacted",
  estimate_scheduled: "Estimate scheduled",
  quote_sent: "Quote sent",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

const statusClasses: Record<QuoteStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-600/20",
  contacted: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  estimate_scheduled:
    "bg-violet-50 text-violet-700 ring-violet-600/20",
  quote_sent: "bg-amber-50 text-amber-700 ring-amber-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-red-50 text-red-700 ring-red-600/20",
  in_progress: "bg-orange-50 text-orange-700 ring-orange-600/20",
  completed: "bg-green-50 text-green-700 ring-green-600/20",
  cancelled: "bg-slate-100 text-slate-700 ring-slate-600/20",
}

export function RecentQuotes({
  quotes,
}: RecentQuotesProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Recent quote requests
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The five most recent requests received from customers.
          </p>
        </div>

        <Link
          to="/admin/quotes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />

          <p className="mt-3 font-medium text-slate-700">
            No quote requests yet.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            New requests submitted from your website will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-100">
          {quotes.map((quote) => (
            <Link
              key={quote.id}
              to="/admin/quotes/$requestId"
              params={{
                requestId: quote.id,
              }}
              className="flex flex-col gap-4 py-4 transition first:pt-0 last:pb-0 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">
                    #{quote.requestNumber}
                  </p>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[quote.status]}`}
                  >
                    {statusLabels[quote.status]}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" />
                    {quote.customerName}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    {quote.serviceName}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(quote.createdAt)}
                  </span>
                </div>
              </div>

              <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}