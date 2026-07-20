import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  )
}