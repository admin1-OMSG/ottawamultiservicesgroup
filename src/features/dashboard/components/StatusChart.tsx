import type { QuoteStatus, StatusSummary } from "../types"

type StatusChartProps = {
  statuses: StatusSummary[]
}

type ChartStatus = {
  status: QuoteStatus
  label: string
  count: number
  className: string
  strokeColor: string
}

const statusSettings: Record<
  QuoteStatus,
  {
    label: string
    className: string
    strokeColor: string
  }
> = {
  new: {
    label: "New",
    className: "bg-blue-500",
    strokeColor: "#3b82f6",
  },
  contacted: {
    label: "Contacted",
    className: "bg-cyan-500",
    strokeColor: "#06b6d4",
  },
  estimate_scheduled: {
    label: "Estimate scheduled",
    className: "bg-violet-500",
    strokeColor: "#8b5cf6",
  },
  quote_sent: {
    label: "Quote sent",
    className: "bg-amber-500",
    strokeColor: "#f59e0b",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-500",
    strokeColor: "#10b981",
  },
  declined: {
    label: "Declined",
    className: "bg-red-500",
    strokeColor: "#ef4444",
  },
  in_progress: {
    label: "In progress",
    className: "bg-orange-500",
    strokeColor: "#f97316",
  },
  completed: {
    label: "Completed",
    className: "bg-green-600",
    strokeColor: "#16a34a",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-400",
    strokeColor: "#94a3b8",
  },
}

export function StatusChart({
  statuses,
}: StatusChartProps) {
  const chartStatuses: ChartStatus[] = statuses
    .filter((item) => item.count > 0)
    .map((item) => {
      const settings = statusSettings[item.status]

      return {
        status: item.status,
        label: settings.label,
        count: item.count,
        className: settings.className,
        strokeColor: settings.strokeColor,
      }
    })
    .sort((firstStatus, secondStatus) => {
      return secondStatus.count - firstStatus.count
    })

  const totalQuotes = chartStatuses.reduce(
    (total, item) => total + item.count,
    0,
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-950">
          Quote status overview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Distribution of quote requests by current status.
        </p>
      </div>

      {totalQuotes === 0 ? (
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <div>
            <p className="font-medium text-slate-700">
              No status information available.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Quote activity will appear here once requests are received.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 sm:grid-cols-[180px_1fr] sm:items-center">
          <DonutChart
            statuses={chartStatuses}
            total={totalQuotes}
          />

          <div className="space-y-4">
            {chartStatuses.map((item) => {
              const percentage = Math.round(
                (item.count / totalQuotes) * 100,
              )

              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.className}`}
                      />

                      <span className="truncate text-sm font-medium text-slate-700">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-slate-950">
                        {item.count}
                      </span>

                      <span className="w-10 text-right text-xs text-slate-500">
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.className}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function DonutChart({
  statuses,
  total,
}: {
  statuses: ChartStatus[]
  total: number
}) {
  const radius = 58
  const circumference = 2 * Math.PI * radius

  let accumulatedPercentage = 0

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg
        viewBox="0 0 160 160"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Quote status distribution for ${total} requests`}
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="18"
        />

        {statuses.map((item) => {
          const percentage = item.count / total
          const segmentLength = circumference * percentage
          const segmentOffset =
            circumference * accumulatedPercentage

          accumulatedPercentage += percentage

          return (
            <circle
              key={item.status}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={item.strokeColor}
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${segmentLength} ${
                circumference - segmentLength
              }`}
              strokeDashoffset={-segmentOffset}
            />
          )
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-slate-950">
          {total}
        </span>

        <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Quotes
        </span>
      </div>
    </div>
  )
}