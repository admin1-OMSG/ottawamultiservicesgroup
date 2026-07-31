import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { CalendarDays, CheckCircle2, FileSignature, FileText, LogOut, ReceiptText, RotateCcw, UserRound } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { sendCrmEmail } from "@/lib/email-notifications"
import { formatCad, formatDate } from "@/features/admin/formatters"

export const Route = createFileRoute("/portal")({ component: CustomerPortal })

type Customer = { id: string; first_name: string; last_name: string | null; email: string; phone: string | null }
type Estimate = { id: string; estimate_number: string; title: string | null; status: string; valid_until: string | null; total: number; created_at: string }
type Invoice = { id: string; invoice_number: string; title: string | null; status: string; issue_date: string; due_date: string | null; total: number; amount_paid: number; balance_due: number }
type Job = { id: string; job_number: string; title: string; status: string; scheduled_start: string | null; address_line: string | null; city: string | null }
type Signature = { estimate_id: string; signer_name: string; signed_at: string }

const statusLabel: Record<string, string> = { draft: "Brouillon", pending_review: "À réviser", sent: "Envoyé", viewed: "Consulté", accepted: "Accepté", rejected: "Refusé", expired: "Expiré", cancelled: "Annulé", converted_to_job: "Converti", partially_paid: "Partiellement payée", paid: "Payée", overdue: "En retard", void: "Annulée", unscheduled: "À planifier", scheduled: "Planifiée", in_progress: "En cours", completed: "Terminée" }

function CustomerPortal() {
  const [sessionReady, setSessionReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [signatures, setSignatures] = useState<Record<string, Signature>>({})
  const [signingEstimate, setSigningEstimate] = useState<Estimate | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    void initialise()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session))
      if (session) void loadPortal()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function initialise() {
    const { data } = await supabase.auth.getSession()
    setLoggedIn(Boolean(data.session))
    setSessionReady(true)
    if (data.session) await loadPortal()
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError("")
    setMessage("")
    const { error: signInError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/portal` } })
    setSending(false)
    if (signInError) setError(signInError.message)
    else setMessage("Un lien de connexion sécurisé vient d’être envoyé à votre adresse courriel.")
  }

  async function loadPortal() {
    setError("")
    const { data: account, error: accountError } = await supabase.from("customer_accounts").select("customer_id").single()
    if (accountError || !account) {
      setCustomer(null)
      setError("Aucun dossier client n’est associé à cette adresse. Communiquez avec Ottawa Multiservices Group pour faire vérifier votre courriel.")
      return
    }
    const customerId = account.customer_id
    const [customerResult, estimatesResult, invoicesResult, jobsResult, signaturesResult] = await Promise.all([
      supabase.from("customers").select("id,first_name,last_name,email,phone").eq("id", customerId).single(),
      supabase.from("estimates").select("id,estimate_number,title,status,valid_until,total,created_at").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("id,invoice_number,title,status,issue_date,due_date,total,amount_paid,balance_due").eq("customer_id", customerId).order("issue_date", { ascending: false }),
      supabase.from("jobs").select("id,job_number,title,status,scheduled_start,address_line,city").eq("customer_id", customerId).order("scheduled_start", { ascending: true }),
      supabase.from("estimate_signatures").select("estimate_id,signer_name,signed_at").eq("customer_id", customerId),
    ])
    if (customerResult.error) { setError(customerResult.error.message); return }
    setCustomer(customerResult.data as Customer)
    setEstimates((estimatesResult.data ?? []) as Estimate[])
    setInvoices((invoicesResult.data ?? []) as Invoice[])
    setJobs((jobsResult.data ?? []) as Job[])
    const signatureMap = Object.fromEntries(((signaturesResult.data ?? []) as Signature[]).map((signature) => [signature.estimate_id, signature]))
    setSignatures(signatureMap)
  }

  async function rejectEstimate(id: string) {
    setError("")
    const { error: responseError } = await supabase.rpc("customer_respond_to_estimate", { p_estimate_id: id, p_response: "rejected" })
    if (responseError) { setError(responseError.message); return }
    await loadPortal()
  }

  async function logout() {
    await supabase.auth.signOut()
    setCustomer(null); setEstimates([]); setInvoices([]); setJobs([]); setSignatures({}); setLoggedIn(false)
  }

  if (!sessionReady) return <div className="grid min-h-screen place-items-center bg-slate-50">Chargement…</div>
  if (!loggedIn) return <div className="min-h-screen bg-slate-50"><PortalHeader /><main className="mx-auto max-w-md px-6 py-20"><div className="rounded-2xl border bg-white p-7 shadow-sm"><p className="text-sm font-semibold text-emerald-700">PORTAIL CLIENT · VERSION 0.7</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Accédez à votre dossier</h1><p className="mt-3 text-slate-600">Recevez un lien sécurisé par courriel. Aucun mot de passe n’est nécessaire.</p>{error && <Alert text={error} />}{message && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}<form onSubmit={sendLink} className="mt-6"><label className="text-sm font-semibold">Adresse courriel<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="nom@exemple.ca" /></label><button disabled={sending} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700">{sending ? "Envoi…" : "Recevoir mon lien de connexion"}</button></form><p className="mt-5 text-center text-xs text-slate-500">Utilisez la même adresse courriel que celle fournie lors de votre demande de devis.</p></div></main></div>

  return <div className="min-h-screen bg-slate-100"><PortalHeader customer={customer} onLogout={logout} /><main className="mx-auto max-w-6xl space-y-8 px-5 py-8">{error && <Alert text={error} />}<section><p className="text-sm font-semibold text-emerald-700">ESPACE CLIENT</p><h1 className="mt-1 text-3xl font-bold">Bonjour {customer?.first_name ?? ""}</h1><p className="text-slate-600">Consultez et signez vos devis, puis suivez vos factures et interventions.</p></section><div className="grid gap-4 sm:grid-cols-3"><Stat icon={ReceiptText} label="Devis" value={estimates.length} /><Stat icon={FileText} label="Solde à payer" value={formatCad(invoices.reduce((total, invoice) => total + Number(invoice.balance_due), 0))} /><Stat icon={CalendarDays} label="Interventions" value={jobs.length} /></div><Section title="Mes devis"><div className="grid gap-4">{estimates.length === 0 ? <Empty /> : estimates.map((estimate) => { const signature = signatures[estimate.id]; const canRespond = ["sent", "viewed", "pending_review"].includes(estimate.status); return <article key={estimate.id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-blue-700">{estimate.estimate_number}</p><h3 className="text-lg font-semibold">{estimate.title || "Devis de service"}</h3><p className="text-sm text-slate-500">Créé le {formatDate(estimate.created_at)}{estimate.valid_until && ` · Valide jusqu’au ${formatDate(estimate.valid_until)}`}</p></div><div className="text-right"><p className="text-xl font-bold">{formatCad(estimate.total)}</p><Badge status={estimate.status} /></div></div>{signature && <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Signé électroniquement par {signature.signer_name}</p><p>Le {formatDate(signature.signed_at)}</p></div></div>}{canRespond && !signature && <div className="mt-4 flex flex-wrap gap-3 border-t pt-4"><button onClick={() => setSigningEstimate(estimate)} className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><FileSignature className="mr-2 h-4 w-4" />Examiner et signer</button><button onClick={() => void rejectEstimate(estimate.id)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Refuser</button></div>}</article> })}</div></Section><Section title="Mes factures"><div className="overflow-hidden rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Facture</th><th className="p-4">Date</th><th className="p-4">Statut</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Solde</th></tr></thead><tbody className="divide-y">{invoices.map((invoice) => <tr key={invoice.id}><td className="p-4 font-semibold text-blue-700">{invoice.invoice_number}</td><td className="p-4">{formatDate(invoice.issue_date)}</td><td className="p-4"><Badge status={invoice.status} /></td><td className="p-4 text-right">{formatCad(invoice.total)}</td><td className="p-4 text-right font-bold">{formatCad(invoice.balance_due)}</td></tr>)}{invoices.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Aucune facture.</td></tr>}</tbody></table></div></Section><Section title="Mes interventions"><div className="grid gap-4 md:grid-cols-2">{jobs.length === 0 ? <Empty /> : jobs.map((job) => <article key={job.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">{job.job_number}</p><h3 className="font-bold">{job.title}</h3></div><Badge status={job.status} /></div><p className="mt-3 text-sm text-slate-600">{job.scheduled_start ? formatDate(job.scheduled_start) : "Date à confirmer"}</p>{(job.address_line || job.city) && <p className="mt-1 text-sm text-slate-500">{[job.address_line, job.city].filter(Boolean).join(", ")}</p>}</article>)}</div></Section></main>{signingEstimate && customer && <SignatureDialog estimate={signingEstimate} defaultName={`${customer.first_name} ${customer.last_name ?? ""}`.trim()} onClose={() => setSigningEstimate(null)} onSigned={async () => { setSigningEstimate(null); await loadPortal() }} />}</div>
}

function SignatureDialog({ estimate, defaultName, onClose, onSigned }: { estimate: Estimate; defaultName: string; onClose: () => void; onSigned: () => Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [name, setName] = useState(defaultName)
  const [consent, setConsent] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { resizeCanvas() }, [])
  function resizeCanvas() { const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.floor(rect.width * ratio)); canvas.height = Math.max(1, Math.floor(180 * ratio)); const context = canvas.getContext("2d"); if (!context) return; context.scale(ratio, ratio); context.lineWidth = 2.5; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#0f172a" }
  function point(event: PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }
  function start(event: PointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const context = event.currentTarget.getContext("2d"); const p = point(event); context?.beginPath(); context?.moveTo(p.x, p.y) }
  function move(event: PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); const p = point(event); context?.lineTo(p.x, p.y); context?.stroke(); setHasSignature(true) }
  function stop() { drawing.current = false }
  function clear() { const canvas = canvasRef.current; if (!canvas) return; const context = canvas.getContext("2d"); context?.clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false) }
  async function sign() { if (!name.trim() || !consent || !hasSignature) { setError("Inscrivez votre nom, dessinez votre signature et acceptez la déclaration."); return } setSaving(true); setError(""); try { const canvas = canvasRef.current; if (!canvas) throw new Error("Signature indisponible."); const { data, error: invokeError } = await supabase.functions.invoke("sign-estimate", { body: { estimateId: estimate.id, signerName: name.trim(), signatureDataUrl: canvas.toDataURL("image/png"), consentAccepted: consent } }); if (invokeError) throw invokeError; if (data?.error) throw new Error(data.error); const notification = await sendCrmEmail({ type: "estimate_accepted", estimateId: estimate.id }); if (!notification.ok) console.warn("Estimate signed, but admin email was not sent."); await onSigned() } catch (caught) { setError(caught instanceof Error ? caught.message : "Impossible d’enregistrer la signature.") } finally { setSaving(false) } }

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">SIGNATURE ÉLECTRONIQUE</p><h2 className="mt-1 text-2xl font-bold">{estimate.estimate_number}</h2><p className="text-slate-600">{estimate.title || "Devis de service"} · {formatCad(estimate.total)}</p></div><button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">Fermer</button></div>{error && <Alert text={error} />}<div className="mt-6 space-y-5"><label className="block text-sm font-semibold">Nom complet du signataire<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="mt-2 w-full rounded-lg border px-3 py-2.5" /></label><div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold">Dessinez votre signature</label><button type="button" onClick={clear} className="inline-flex items-center text-sm font-semibold text-blue-700"><RotateCcw className="mr-1 h-4 w-4" />Effacer</button></div><canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="h-[180px] w-full touch-none rounded-lg border-2 border-dashed bg-slate-50" /></div><label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 text-sm"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4" /><span>Je confirme avoir examiné ce devis et accepter les services, prix, notes et conditions qui y figurent. Je souhaite que cette signature électronique ait valeur d’acceptation.</span></label><p className="text-xs text-slate-500">La date, l’heure, le compte client, l’adresse IP disponible et le navigateur seront enregistrés comme preuve de l’acceptation.</p><button type="button" onClick={() => void sign()} disabled={saving || !consent || !hasSignature || !name.trim()} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Signer et accepter le devis"}</button></div></div></div>
}

function PortalHeader({ customer, onLogout }: { customer?: Customer | null; onLogout?: () => void }) { return <header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Link to="/" className="font-bold tracking-wide"><span className="text-emerald-400">OTTAWA</span> MULTISERVICES</Link><div className="flex items-center gap-3">{customer && <span className="hidden text-sm text-slate-300 sm:inline"><UserRound className="mr-1 inline h-4 w-4" />{customer.email}</span>}{onLogout && <button onClick={onLogout} className="rounded-lg border border-slate-700 px-3 py-2 text-sm"><LogOut className="mr-1 inline h-4 w-4" />Déconnexion</button>}</div></div></header> }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="mb-4 text-xl font-bold">{title}</h2>{children}</section> }
function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) { return <div className="rounded-xl border bg-white p-5"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div> }
function Badge({ status }: { status: string }) { return <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabel[status] ?? status}</span> }
function Empty() { return <div className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-500">Aucun élément pour le moment.</div> }
function Alert({ text }: { text: string }) { return <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{text}</div> }
