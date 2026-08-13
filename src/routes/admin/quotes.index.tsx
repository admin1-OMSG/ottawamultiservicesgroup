import { useEffect, useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/quotes/")({
  component: AdminQuotesPage,
})

const QUOTE_STATUSES = [
  "new",
  "contacted",
  "estimate_scheduled",
  "quote_sent",
  "accepted",
  "declined",
  "in_progress",
  "completed",
  "cancelled",
] as const

type QuoteStatus = (typeof QUOTE_STATUSES)[number]

type CustomerSummary = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
}

type ServiceRequest = {
  id: string
  request_number: number
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  city: string | null
  service_name: string | null
  preferred_date: string | null
  status: QuoteStatus
  urgency: string | null
  created_at: string
  customer: CustomerSummary | null
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "New",
  contacted: "Customer contacted",
  estimate_scheduled: "Estimate scheduled",
  quote_sent: "Quote sent",
  accepted: "Accepted",
  declined: "Rejected",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

function AdminQuotesPage() {
  const navigate = useNavigate()

  const [quotes, setQuotes] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | QuoteStatus>("all")

  useEffect(() => {
    void loadQuotes()
  }, [])

  async function loadQuotes() {
    setLoading(true)
    setErrorMessage("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        await navigate({
          to: "/admin/login",
        })

        return
      }

      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("id, is_active")
        .eq("id", user.id)
        .eq("is_active", true)
        .maybeSingle()

      if (adminError || !adminUser) {
        await supabase.auth.signOut()

        await navigate({
          to: "/admin/login",
        })

        return
      }

      const { data, error } = await supabase
        .from("service_requests")
        .select(`
          id,
          request_number,
          first_name,
          last_name,
          email,
          phone,
          city,
          service_name,
          preferred_date,
          status,
          urgency,
          created_at,
          customer:customers (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order("created_at", {
          ascending: false,
        })

      if (error) {
        throw error
      }

      setQuotes((data ?? []) as unknown as ServiceRequest[])
    } catch (error) {
      console.error("Unable to load service requests:", error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load quote requests.",
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return quotes.filter((quote) => {
      const customerFirstName =
        quote.customer?.first_name ?? quote.first_name

      const customerLastName =
        quote.customer?.last_name ?? quote.last_name ?? ""

      const customerEmail =
        quote.customer?.email ?? quote.email

      const searchableText = [
        quote.request_number.toString(),
        customerFirstName,
        customerLastName,
        customerEmail,
        quote.phone ?? "",
        quote.city ?? "",
        quote.service_name ?? "",
      ]
        .join(" ")
        .toLowerCase()

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch)

      const matchesStatus =
        statusFilter === "all" ||
        quote.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [quotes, search, statusFilter])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-600">
            Loading quote requests…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/admin"
              className="mb-2 inline-block text-sm font-medium text-blue-700 hover:underline"
            >
              ← Back to dashboard
            </Link>

            <h1 className="text-3xl font-bold text-slate-900">
              Quote Requests
            </h1>

            <p className="mt-1 text-slate-600">
              Review and manage requests received from the website.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadQuotes()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-100"
          >
            Actualiser
          </button>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total des requests
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {quotes.length}
            </p>
          </article>

          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              News
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {quotes.filter((quote) => quote.status === "new").length}
            </p>
          </article>

          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Accepted or in progress
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                quotes.filter((quote) =>
                  ["accepted", "in_progress"].includes(quote.status),
                ).length
              }
            </p>
          </article>
        </section>

        <section className="mb-5 rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <label
                htmlFor="quote-search"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Search
              </label>

              <input
                id="quote-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Number, customer, email, city, or service"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | QuoteStatus,
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All statuses</option>

                {QUOTE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">
              Loading error
            </p>

            <p className="mt-1 text-sm">
              {errorMessage}
            </p>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {filteredQuotes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-800">
                No requests found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Modifiez votre recherche ou votre filtre.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead className="bg-slate-100 text-sm text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Number
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Customer
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Service
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      City
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Date
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredQuotes.map((quote) => {
                    const firstName =
                      quote.customer?.first_name ?? quote.first_name

                    const lastName =
                      quote.customer?.last_name ?? quote.last_name

                    const customerName = [firstName, lastName]
                      .filter(Boolean)
                      .join(" ")

                    return (
                      <tr
                        key={quote.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          #{quote.request_number}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">
                            {customerName}
                          </p>

                          <p className="text-sm text-slate-500">
                            {quote.customer?.email ?? quote.email}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {quote.service_name ?? "Not specified"}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {quote.city ?? "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {STATUS_LABELS[quote.status]}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {new Intl.DateTimeFormat("fr-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }).format(new Date(quote.created_at))}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            to="/admin/quotes/$requestId"
                            params={{
                              requestId: quote.id,
                            }}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            Consulter
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-sm text-slate-500">
          {filteredQuotes.length} request
          {filteredQuotes.length !== 1 ? "s" : ""} displayed
          {filteredQuotes.length !== 1 ? "s" : ""}.
        </p>
      </div>
    </main>
  )
}