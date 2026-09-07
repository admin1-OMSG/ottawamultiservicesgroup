import { useEffect, useMemo, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  BriefcaseBusiness,
  Download,
  FileText,
  Mail,
  Phone,
  Search,
  Save,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/admin/PageHeader"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/careers")({
  component: CareersAdminPage,
})

type CareerStatus =
  | "new"
  | "under_review"
  | "interview"
  | "hired"
  | "rejected"
  | "archived"

type CareerApplication = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string | null
  position_interest: string
  employment_type: string | null
  availability: string | null
  experience: string | null
  has_drivers_license: boolean | null
  has_vehicle: boolean | null
  authorized_to_work_canada: boolean | null
  omsg_relationship: "yes" | "no" | "worked_before"
  languages: string | null
  preferred_language: string | null
  message: string | null
  resume_file_name: string | null
  resume_storage_path: string | null
  status: CareerStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

const statusOptions: { value: CareerStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
]

function CareersAdminPage() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<CareerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | CareerStatus>("all")
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError("")
    try {
      if (!(await requireActiveAdmin())) {
        await navigate({ to: "/admin/login" })
        return
      }

      const { data, error: loadError } = await supabase
        .from("career_applications")
        .select(
          "id,first_name,last_name,email,phone,city,position_interest,employment_type,availability,experience,has_drivers_license,has_vehicle,authorized_to_work_canada,omsg_relationship,languages,preferred_language,message,resume_file_name,resume_storage_path,status,admin_notes,created_at,updated_at,reviewed_at,reviewed_by",
        )
        .order("created_at", { ascending: false })

      if (loadError) throw loadError

      const rows = (data ?? []) as CareerApplication[]
      setApplications(rows)
      setDraftNotes(
        Object.fromEntries(rows.map((item) => [item.id, item.admin_notes ?? ""])),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load career applications.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      const haystack = [
        item.first_name,
        item.last_name,
        item.email,
        item.phone,
        item.city,
        item.position_interest,
        item.employment_type,
        item.availability,
        item.experience,
        item.languages,
        item.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [applications, query, statusFilter])

  async function updateStatus(item: CareerApplication, status: CareerStatus) {
    setSavingId(item.id)
    setError("")
    try {
      const user = await requireActiveAdmin()
      if (!user) {
        await navigate({ to: "/admin/login" })
        return
      }

      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from("career_applications")
        .update({
          status,
          reviewed_at: now,
          reviewed_by: user.id,
          updated_at: now,
        })
        .eq("id", item.id)

      if (updateError) throw updateError

      setApplications((current) =>
        current.map((x) =>
          x.id === item.id
            ? { ...x, status, reviewed_at: now, reviewed_by: user.id, updated_at: now }
            : x,
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update application status.")
    } finally {
      setSavingId(null)
    }
  }

  async function saveNotes(item: CareerApplication) {
    setSavingId(item.id)
    setError("")
    try {
      const user = await requireActiveAdmin()
      if (!user) {
        await navigate({ to: "/admin/login" })
        return
      }

      const notes = (draftNotes[item.id] ?? "").trim()
      const now = new Date().toISOString()

      const { error: updateError } = await supabase
        .from("career_applications")
        .update({
          admin_notes: notes || null,
          reviewed_at: now,
          reviewed_by: user.id,
          updated_at: now,
        })
        .eq("id", item.id)

      if (updateError) throw updateError

      setApplications((current) =>
        current.map((x) =>
          x.id === item.id
            ? {
                ...x,
                admin_notes: notes || null,
                reviewed_at: now,
                reviewed_by: user.id,
                updated_at: now,
              }
            : x,
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save internal notes.")
    } finally {
      setSavingId(null)
    }
  }

  async function openResume(item: CareerApplication) {
    setError("")
    try {
      if (!(await requireActiveAdmin())) {
        await navigate({ to: "/admin/login" })
        return
      }
      if (!item.resume_storage_path) throw new Error("No resume is attached to this application.")

      const { data, error: signedUrlError } = await supabase.storage
        .from("career-resumes")
        .createSignedUrl(item.resume_storage_path, 120)

      if (signedUrlError) throw signedUrlError
      if (!data?.signedUrl) throw new Error("Unable to create a secure resume link.")

      window.open(data.signedUrl, "_blank", "noopener,noreferrer")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open resume.")
    }
  }

  async function removeApplication(item: CareerApplication) {
    setError("")
    if (!window.confirm(`Delete the career application from ${item.first_name} ${item.last_name}?`)) {
      return
    }

    try {
      if (!(await requireActiveAdmin())) {
        await navigate({ to: "/admin/login" })
        return
      }

      if (item.resume_storage_path) {
        const { error: storageError } = await supabase.storage
          .from("career-resumes")
          .remove([item.resume_storage_path])

        if (storageError) throw storageError
      }

      const { error: deleteError } = await supabase
        .from("career_applications")
        .delete()
        .eq("id", item.id)

      if (deleteError) throw deleteError

      setApplications((current) => current.filter((x) => x.id !== item.id))
      setDraftNotes((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete career application.")
    }
  }

  const newCount = applications.filter((x) => x.status === "new").length
  const reviewCount = applications.filter((x) => x.status === "under_review").length
  const interviewCount = applications.filter((x) => x.status === "interview").length
  const hiredCount = applications.filter((x) => x.status === "hired").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Careers"
        description="Review job applications, resumes, recruitment status and internal notes."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="New" value={newCount} />
        <Metric label="Under review" value={reviewCount} />
        <Metric label="Interview" value={interviewCount} />
        <Metric label="Hired" value={hiredCount} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search applicants, email, phone, city, position…"
            className="w-full rounded-lg border py-2 pl-9 pr-3"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | CareerStatus)
          }
          className="rounded-lg border bg-white px-3 py-2"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading career applications…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold">No career applications found.</p>
          <p className="text-sm text-slate-500">
            New verified applications submitted from the Careers page will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-xl border bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {item.first_name} {item.last_name}
                    </h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 break-words text-sm font-medium text-teal-700">
                    {item.position_interest}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Received {new Date(item.created_at).toLocaleString("en-CA")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.resume_storage_path && (
                    <button
                      type="button"
                      onClick={() => void openResume(item)}
                      className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      <Download className="h-4 w-4" />
                      View / Download CV
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeApplication(item)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-3">
                <InfoBlock title="Contact">
                  <InfoLine icon={<Mail className="h-4 w-4" />} label="Email" value={item.email} />
                  <InfoLine icon={<Phone className="h-4 w-4" />} label="Phone" value={item.phone} />
                  <Field label="City" value={item.city} />
                  <Field
                    label="Preferred language"
                    value={item.preferred_language === "fr" ? "French" : "English"}
                  />
                </InfoBlock>

                <InfoBlock title="Employment">
                  <Field label="Position / area" value={item.position_interest} />
                  <Field label="Employment type" value={humanize(item.employment_type)} />
                  <Field label="Availability" value={item.availability} />
                  <Field
                    label="OMSG relationship"
                    value={
                      item.omsg_relationship === "yes"
                        ? "Currently works with OMSG"
                        : item.omsg_relationship === "worked_before"
                          ? "Worked with OMSG before"
                          : "No previous OMSG work"
                    }
                  />
                </InfoBlock>

                <InfoBlock title="Requirements">
                  <Field label="Driver's licence" value={yesNo(item.has_drivers_license)} />
                  <Field label="Vehicle available" value={yesNo(item.has_vehicle)} />
                  <Field
                    label="Authorized to work in Canada"
                    value={yesNo(item.authorized_to_work_canada)}
                  />
                  <Field label="Languages" value={item.languages} />
                  <Field label="Resume" value={item.resume_file_name} />
                </InfoBlock>
              </div>

              {(item.experience || item.message) && (
                <div className="grid gap-4 border-t p-5 lg:grid-cols-2">
                  <LongText label="Experience" value={item.experience} />
                  <LongText label="Applicant message" value={item.message} />
                </div>
              )}

              <div className="grid gap-4 border-t bg-slate-50/60 p-5 lg:grid-cols-[280px_1fr_auto] lg:items-end">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Recruitment status</span>
                  <select
                    value={item.status}
                    disabled={savingId === item.id}
                    onChange={(event) =>
                      void updateStatus(item, event.target.value as CareerStatus)
                    }
                    className="w-full rounded-lg border bg-white px-3 py-2"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Internal notes</span>
                  <textarea
                    rows={3}
                    value={draftNotes[item.id] ?? ""}
                    onChange={(event) =>
                      setDraftNotes((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Interview notes, availability follow-up, references, next steps…"
                    className="w-full resize-y rounded-lg border bg-white px-3 py-2"
                  />
                </label>

                <button
                  type="button"
                  disabled={savingId === item.id}
                  onClick={() => void saveNotes(item)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingId === item.id ? "Saving…" : "Save notes"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <h3 className="mb-3 font-bold text-slate-800">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-slate-800">{value || "—"}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
        {value || "—"}
      </p>
    </div>
  )
}

function LongText({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {value || "—"}
      </p>
    </div>
  )
}

function humanize(value: string | null) {
  return value ? value.replaceAll("_", " ") : "—"
}

function yesNo(value: boolean | null) {
  if (value === null) return "—"
  return value ? "Yes" : "No"
}

function StatusBadge({ status }: { status: CareerStatus }) {
  const classes =
    status === "hired"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : status === "interview"
          ? "bg-cyan-50 text-cyan-700"
          : status === "under_review"
            ? "bg-amber-50 text-amber-700"
            : status === "archived"
              ? "bg-slate-100 text-slate-600"
              : "bg-blue-50 text-blue-700"

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {status.replaceAll("_", " ")}
    </span>
  )
}
