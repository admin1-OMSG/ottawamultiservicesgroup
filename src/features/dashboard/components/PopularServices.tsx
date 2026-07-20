import type { PopularService } from "../types"

type PopularServicesProps = {
  services: PopularService[]
}

export function PopularServices({
  services,
}: PopularServicesProps) {
  const maxCount =
    Math.max(...services.map((service) => service.count), 1)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-950">
          Most Requested Services
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Top services requested by your customers.
        </p>
      </div>

      {services.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-medium text-slate-700">
            No services requested yet.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Statistics will appear automatically when requests arrive.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {services.map((service, index) => {
            const percentage = Math.round(
              (service.count / maxCount) * 100,
            )

            return (
              <div key={service.serviceName}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
                      {index + 1}
                    </div>

                    <div>
                      <p className="font-medium text-slate-900">
                        {service.serviceName}
                      </p>

                      <p className="text-xs text-slate-500">
                        {service.count} request{service.count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-slate-700">
                    {percentage}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}