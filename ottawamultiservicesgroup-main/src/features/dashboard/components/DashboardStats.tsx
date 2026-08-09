import {
  CheckCircle2,
  ClipboardList,
  Users,
  Workflow,
} from "lucide-react"

import type { DashboardStats as DashboardStatsType } from "../types"

type DashboardStatsProps = {
  stats: DashboardStatsType
}

const statCards = [
  {
    key: "totalQuotes",
    label: "Total Quotes",
    description: "All quote requests received",
    icon: ClipboardList,
  },
  {
    key: "totalCustomers",
    label: "Customers",
    description: "Unique customer records",
    icon: Users,
  },
  {
    key: "activeQuotes",
    label: "Active Quotes",
    description: "Quotes currently being processed",
    icon: Workflow,
  },
  {
    key: "completedQuotes",
    label: "Completed",
    description: "Successfully completed requests",
    icon: CheckCircle2,
  },
] as const

export function DashboardStats({
  stats,
}: DashboardStatsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon
        const value = stats[card.key]

        return (
          <article
            key={card.key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {value}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {card.description}
            </p>
          </article>
        )
      })}
    </section>
  )
}