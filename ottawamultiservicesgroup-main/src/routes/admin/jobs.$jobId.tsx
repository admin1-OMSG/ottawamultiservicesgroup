import { useEffect, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatDate } from "@/features/admin/formatters"
import { supabase } from "@/lib/supabase"
import { sendCrmEmail } from "@/lib/email-notifications"

export const Route = createFileRoute("/admin/jobs/$jobId")({ component: JobDetailPage })

type Job = {
  id: string
  job_number: string
  title: string
  description: string | null
  status: string
  priority: string
  scheduled_start: string | null
  scheduled_end: string | null
  address_line: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  internal_notes: string | null
  customer: { first_name: string; last_name: string | null; email: string; phone: string | null } | null
  employee: { id: string; first_name: string; last_name: string | null } | null
}
type Employee = { id: string; first_name: string; last_name: string | null }

const statuses = {
  unscheduled: "À planifier",
  scheduled: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
}

function toLocalInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function JobDetailPage() {
  const { jobId } = Route.useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [status, setStatus] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { void load() }, [jobId])

  async function load() {
    try {
      if (!(await requireActiveAdmin())) {
        await navigate({ to: "/admin/login" })
        return
      }
      const [jobResult, employeeResult] = await Promise.all([
        supabase.from("jobs").select("id,job_number,title,description,status,priority,scheduled_start,scheduled_end,address_line,city,province,postal_code,internal_notes,customer:customers(first_name,last_name,email,phone),employee:employees(id,first_name,last_name)").eq("id", jobId).maybeSingle(),
        supabase.from("employees").select("id,first_name,last_name").eq("status", "active").order("first_name"),
      ])
      if (jobResult.error) throw jobResult.error
      if (!jobResult.data) throw new Error("Intervention introuvable.")
      const typed = jobResult.data as unknown as Job
      setJob(typed)
      setStatus(typed.status)
      setEmployeeId(typed.employee?.id || "")
      setStart(toLocalInput(typed.scheduled_start))
      setEnd(toLocalInput(typed.scheduled_end))
      setNotes(typed.internal_notes || "")
      setEmployees((employeeResult.data ?? []) as Employee[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chargement impossible.")
    }
  }

  async function save() {
    if (!job) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const user = await requireActiveAdmin()
      if (!user) return
      const newStart = start ? new Date(start).toISOString() : null
      const newEnd = end ? new Date(end).toISOString() : null
      const scheduleChanged = newStart !== job.scheduled_start
      const nextStatus = newStart && status === "unscheduled" ? "scheduled" : status

      const { error: updateError } = await supabase.from("jobs").update({
        status: nextStatus,
        assigned_employee_id: employeeId || null,
        scheduled_start: newStart,
        scheduled_end: newEnd,
        internal_notes: notes || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id)
      if (updateError) throw updateError

      let message = "Intervention mise à jour."
      if (newStart && scheduleChanged) {
        const notification = await sendCrmEmail({ type: "appointment_proposed", jobId: job.id })
        message = notification.ok
          ? "Intervention mise à jour et proposition de rendez-vous envoyée au client."
          : "Intervention mise à jour, mais le courriel de rendez-vous n’a pas pu être envoyé."
      }
      setSuccess(message)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mise à jour impossible.")
    } finally {
      setSaving(false)
    }
  }

  if (!job) return <p>{error || "Chargement…"}</p>

  return <div className="space-y-6">
    <header>
      <Link to="/admin/jobs" className="text-sm font-semibold text-blue-700">← Retour aux interventions</Link>
      <h1 className="mt-2 text-3xl font-bold">{job.job_number}</h1>
      <p className="text-slate-600">{job.title}</p>
    </header>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{success}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Client et lieu</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="Client" value={job.customer ? `${job.customer.first_name} ${job.customer.last_name ?? ""}` : null} />
            <Info label="Téléphone" value={job.customer?.phone || null} />
            <Info label="Courriel" value={job.customer?.email || null} />
            <Info label="Adresse" value={[job.address_line, job.city, job.province, job.postal_code].filter(Boolean).join(", ")} />
          </div>
        </section>
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Travail</h2>
          <p className="mt-3 whitespace-pre-wrap text-slate-700">{job.description || "Aucune description."}</p>
        </section>
      </div>
      <aside className="space-y-6">
        <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">Planification</h2>
          <label className="block text-sm font-medium">Début proposé
            <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">Fin prévue
            <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          {job.scheduled_start && <p className="text-xs text-slate-500">Rendez-vous actuel : {formatDate(job.scheduled_start)}</p>}
          <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">Lorsque vous changez la date et enregistrez, le client reçoit automatiquement la proposition par courriel.</p>
        </section>
        <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">Gestion</h2>
          <label className="block text-sm font-medium">Statut
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
              {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Employé
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="">Non affecté</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name ?? ""}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Notes internes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border px-3 py-2" />
          </label>
          <button onClick={() => void save()} disabled={saving} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </section>
      </aside>
    </div>
  </div>
}

function Info({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || "—"}</dd></div>
}
