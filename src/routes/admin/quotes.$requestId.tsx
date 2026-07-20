import { useCallback, useEffect, useState } from "react"
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/quotes/$requestId")({
  component: AdminQuoteDetailPage,
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

const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Nouvelle",
  contacted: "Client contacté",
  estimate_scheduled: "Estimation planifiée",
  quote_sent: "Devis envoyé",
  accepted: "Accepté",
  declined: "Refusé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  address_line: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  status: string
  internal_notes: string | null
}

type ServiceRequest = {
  id: string
  request_number: number
  customer_id: string | null

  first_name: string
  last_name: string | null
  email: string
  phone: string | null

  address_line: string | null
  city: string | null
  province: string | null
  postal_code: string | null

  service_id: string | null
  service_name: string | null

  preferred_date: string | null
  preferred_time: string | null
  urgency: string | null

  description: string | null
  questionnaire_answers: Record<string, unknown>

  status: QuoteStatus
  source: string | null
  internal_notes: string | null

  created_at: string
  updated_at: string

  customer: Customer | null
}

type QuoteHistoryEntry = {
  id: string
  action_type: string
  old_status: QuoteStatus | null
  new_status: QuoteStatus | null
  description: string | null
  actor_user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

function AdminQuoteDetailPage() {
  const { requestId } = Route.useParams()
  const navigate = useNavigate()

  const [quote, setQuote] = useState<ServiceRequest | null>(null)
  const [history, setHistory] = useState<QuoteHistoryEntry[]>([])

  const [selectedStatus, setSelectedStatus] =
    useState<QuoteStatus>("new")

  const [internalNotes, setInternalNotes] = useState("")

  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const loadQuote = useCallback(async () => {
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

      const { data: quoteData, error: quoteError } = await supabase
        .from("service_requests")
        .select(`
          id,
          request_number,
          customer_id,
          first_name,
          last_name,
          email,
          phone,
          address_line,
          city,
          province,
          postal_code,
          service_id,
          service_name,
          preferred_date,
          preferred_time,
          urgency,
          description,
          questionnaire_answers,
          status,
          source,
          internal_notes,
          created_at,
          updated_at,
          customer:customers (
            id,
            first_name,
            last_name,
            email,
            phone,
            address_line,
            city,
            province,
            postal_code,
            status,
            internal_notes
          )
        `)
        .eq("id", requestId)
        .maybeSingle()

      if (quoteError) {
        throw quoteError
      }

      if (!quoteData) {
        setQuote(null)
        setErrorMessage("Cette demande de devis est introuvable.")
        return
      }

      const typedQuote =
        quoteData as unknown as ServiceRequest

      setQuote(typedQuote)
      setSelectedStatus(typedQuote.status)
      setInternalNotes(typedQuote.internal_notes ?? "")

      const { data: historyData, error: historyError } =
        await supabase
          .from("quote_history")
          .select(`
            id,
            action_type,
            old_status,
            new_status,
            description,
            actor_user_id,
            metadata,
            created_at
          `)
          .eq("service_request_id", requestId)
          .order("created_at", {
            ascending: false,
          })

      if (historyError) {
        throw historyError
      }

      setHistory(
        (historyData ?? []) as unknown as QuoteHistoryEntry[],
      )
    } catch (error) {
      console.error("Unable to load quote details:", error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger cette demande.",
      )
    } finally {
      setLoading(false)
    }
  }, [navigate, requestId])

  useEffect(() => {
    void loadQuote()
  }, [loadQuote])

  async function updateStatus() {
    if (!quote || selectedStatus === quote.status) {
      return
    }

    setSavingStatus(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const { error } = await supabase
        .from("service_requests")
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quote.id)

      if (error) {
        throw error
      }

      setSuccessMessage("Le statut a été mis à jour.")
      await loadQuote()
    } catch (error) {
      console.error("Unable to update quote status:", error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut.",
      )
    } finally {
      setSavingStatus(false)
    }
  }

  async function saveInternalNotes() {
    if (!quote) {
      return
    }

    setSavingNotes(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const cleanNotes = internalNotes.trim()

      const { error } = await supabase
        .from("service_requests")
        .update({
          internal_notes: cleanNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quote.id)

      if (error) {
        throw error
      }

      setQuote((currentQuote) =>
        currentQuote
          ? {
              ...currentQuote,
              internal_notes: cleanNotes || null,
              updated_at: new Date().toISOString(),
            }
          : null,
      )

      setSuccessMessage("Les notes internes ont été enregistrées.")
    } catch (error) {
      console.error("Unable to save internal notes:", error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer les notes.",
      )
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-600">
            Chargement de la demande…
          </p>
        </div>
      </main>
    )
  }

  if (!quote) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/admin/quotes"
            className="font-medium text-blue-700 hover:underline"
          >
            ← Retour aux demandes
          </Link>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-bold text-red-900">
              Demande introuvable
            </h1>

            <p className="mt-2 text-red-800">
              {errorMessage ||
                "La demande demandée n’existe pas ou n’est plus disponible."}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const customer = quote.customer

  const customerFirstName =
    customer?.first_name ?? quote.first_name

  const customerLastName =
    customer?.last_name ?? quote.last_name

  const customerName = [
    customerFirstName,
    customerLastName,
  ]
    .filter(Boolean)
    .join(" ")

  const customerEmail = customer?.email ?? quote.email
  const customerPhone = customer?.phone ?? quote.phone

  const addressLine =
    customer?.address_line ?? quote.address_line

  const city = customer?.city ?? quote.city
  const province = customer?.province ?? quote.province
  const postalCode =
    customer?.postal_code ?? quote.postal_code

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <Link
            to="/admin/quotes"
            className="mb-3 inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            ← Retour aux demandes
          </Link>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Demande de devis
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                #{quote.request_number}
              </h1>

              <p className="mt-2 text-slate-600">
                Reçue le {formatDateTime(quote.created_at)}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
        </header>

        {errorMessage ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Client
              </h2>

              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Nom"
                  value={customerName}
                />

                <DetailItem
                  label="Courriel"
                  value={customerEmail}
                  type="email"
                />

                <DetailItem
                  label="Téléphone"
                  value={customerPhone}
                  type="phone"
                />

                <DetailItem
                  label="Ville"
                  value={city}
                />

                <div className="sm:col-span-2">
                  <DetailItem
                    label="Adresse"
                    value={[
                      addressLine,
                      city,
                      province,
                      postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                </div>
              </dl>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Service demandé
              </h2>

              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Service"
                  value={quote.service_name}
                />

                <DetailItem
                  label="Urgence"
                  value={formatUrgency(quote.urgency)}
                />

                <DetailItem
                  label="Date souhaitée"
                  value={
                    quote.preferred_date
                      ? formatDate(quote.preferred_date)
                      : null
                  }
                />

                <DetailItem
                  label="Heure souhaitée"
                  value={quote.preferred_time}
                />

                <DetailItem
                  label="Source"
                  value={quote.source}
                />

                <DetailItem
                  label="Dernière modification"
                  value={formatDateTime(quote.updated_at)}
                />
              </dl>

              <div className="mt-6 border-t pt-5">
                <h3 className="font-semibold text-slate-900">
                  Description
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-slate-700">
                  {quote.description || "Aucune description fournie."}
                </p>
              </div>
            </section>

            <QuestionnaireSection
              answers={quote.questionnaire_answers}
            />

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Notes internes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Ces notes ne sont pas visibles par le client.
              </p>

              <textarea
                value={internalNotes}
                onChange={(event) =>
                  setInternalNotes(event.target.value)
                }
                rows={7}
                placeholder="Ajoutez des observations, détails d’appel ou instructions…"
                className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => void saveInternalNotes()}
                disabled={savingNotes}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingNotes
                  ? "Enregistrement…"
                  : "Enregistrer les notes"}
              </button>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Modifier le statut
              </h2>

              <label
                htmlFor="quote-status"
                className="mt-4 block text-sm font-medium text-slate-700"
              >
                Nouveau statut
              </label>

              <select
                id="quote-status"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target.value as QuoteStatus,
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {QUOTE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void updateStatus()}
                disabled={
                  savingStatus ||
                  selectedStatus === quote.status
                }
                className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingStatus
                  ? "Mise à jour…"
                  : "Mettre à jour"}
              </button>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Actions rapides
              </h2>

              <div className="mt-4 space-y-3">
                <a
                  href={`mailto:${customerEmail}`}
                  className="block rounded-lg border border-slate-300 px-4 py-2 text-center font-medium text-slate-800 hover:bg-slate-50"
                >
                  Envoyer un courriel
                </a>

                {customerPhone ? (
                  <a
                    href={`tel:${customerPhone}`}
                    className="block rounded-lg border border-slate-300 px-4 py-2 text-center font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Appeler le client
                  </a>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Historique
              </h2>

              {history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Aucun événement enregistré.
                </p>
              ) : (
                <ol className="mt-5 space-y-5">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="relative border-l-2 border-slate-200 pl-4"
                    >
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-slate-500" />

                      <p className="font-medium text-slate-900">
                        {historyTitle(entry)}
                      </p>

                      {entry.description ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {entry.description}
                        </p>
                      ) : null}

                      <time className="mt-1 block text-xs text-slate-500">
                        {formatDateTime(entry.created_at)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

function DetailItem({
  label,
  value,
  type,
}: {
  label: string
  value: string | null | undefined
  type?: "email" | "phone"
}) {
  const displayedValue =
    value && value.trim() !== "" ? value : "Non précisé"

  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 font-medium text-slate-900">
        {type === "email" && value ? (
          <a
            href={`mailto:${value}`}
            className="text-blue-700 hover:underline"
          >
            {value}
          </a>
        ) : type === "phone" && value ? (
          <a
            href={`tel:${value}`}
            className="text-blue-700 hover:underline"
          >
            {value}
          </a>
        ) : (
          displayedValue
        )}
      </dd>
    </div>
  )
}

function QuestionnaireSection({
  answers,
}: {
  answers: Record<string, unknown> | null
}) {
  const entries = answers
    ? Object.entries(answers)
    : []

  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Réponses au questionnaire
      </h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-slate-500">
          Aucune réponse supplémentaire.
        </p>
      ) : (
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <DetailItem
              key={key}
              label={formatFieldName(key)}
              value={formatAnswer(value)}
            />
          ))}
        </dl>
      )}
    </section>
  )
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Non précisé"
  }

  if (typeof value === "boolean") {
    return value ? "Oui" : "Non"
  }

  if (Array.isArray(value)) {
    return value.map(formatAnswer).join(", ")
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase())
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function formatUrgency(urgency: string | null): string {
  const urgencyLabels: Record<string, string> = {
    standard: "Standard",
    urgent: "Urgent",
    emergency: "Urgence",
  }

  if (!urgency) {
    return "Non précisé"
  }

  return urgencyLabels[urgency] ?? urgency
}

function historyTitle(entry: QuoteHistoryEntry): string {
  if (
    entry.action_type === "status_changed" &&
    entry.new_status
  ) {
    return `Statut : ${STATUS_LABELS[entry.new_status]}`
  }

  if (entry.action_type === "request_created") {
    return "Demande créée"
  }

  return formatFieldName(entry.action_type)
}