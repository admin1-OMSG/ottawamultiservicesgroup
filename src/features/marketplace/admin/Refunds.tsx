import { useState } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import { buttonClass, fieldClass, quietButtonClass, type Language, type Refund, type Translate, type Update } from "./model";

type Props = { text: Translate; language: Language; busy: boolean; update: Update };
function reviewLabel(status: string, text: Translate) {
  if (status === "approved") return text("Approved","Approuvé");
  if (status === "denied") return text("Declined","Refusé");
  return text("Awaiting review","À examiner");
}

function RefundRow({refund, text, language, busy, update}: Props & {refund: Refund}) {
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState("");
  const pending = refund.status === "pending";
  const decide = (approve: boolean) => void update("market_review_refund", {
    p_contact_id: refund.contact_id, p_approve: approve, p_note: note.trim(),
  });
  const reason = refund.reason === "invalid_phone" ? text("Phone number does not exist","Numéro de téléphone inexistant") : text("Customer posted by mistake","Demande créée par erreur");
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="font-bold text-slate-900">{refund.title || text("Service request","Demande de service")}</h3><p className="mt-1 text-sm text-slate-600">{refund.provider_name} · {new Date(refund.created_at).toLocaleDateString(language === "en" ? "en-CA":"fr-CA")}</p></div>
      <span className={pending ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"}>{reviewLabel(refund.status,text)}</span>
    </div>
    <dl className="my-4 grid gap-x-5 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-slate-500">{text("Reason","Motif")}</dt><dd className="mt-1 font-medium">{reason}</dd></div>
      <div><dt className="text-xs text-slate-500">{text("Credits charged","Crédits débités")}</dt><dd className="mt-1 font-semibold">{refund.credits}</dd></div>
      <div><dt className="text-xs text-slate-500">{text("Customer contact","Coordonnées du client")}</dt><dd className="mt-1 break-words">{[refund.client_phone,refund.client_email].filter(Boolean).join(" · ") || "—"}</dd></div>
      <div><dt className="text-xs text-slate-500">{text("Professional contact","Coordonnées du professionnel")}</dt><dd className="mt-1 break-words">{refund.provider_email || "—"}</dd></div>
    </dl>
    {refund.request_note && <p className="mb-3 whitespace-pre-wrap text-sm"><span className="font-semibold">{text("Professional’s message","Message du professionnel")}</span><br/>{refund.request_note}</p>}
    {pending ? <div className="grid gap-3 border-t border-slate-100 pt-4">
      <label className="grid gap-1 text-sm font-medium">{text("Decision note","Motif de la décision")}<textarea className={fieldClass} rows={2} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} /></label>
      <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} />{text("I checked the reason given for this refund.","J’ai vérifié le motif de cette demande de remboursement.")}</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={busy || !verified || !note.trim()} onClick={()=>decide(true)}>{text("Approve and return credits","Approuver et recréditer")}</button>
        <button type="button" className={quietButtonClass} disabled={busy || !verified || !note.trim()} onClick={()=>decide(false)}>{text("Decline request","Refuser la demande")}</button>
      </div>
    </div> : refund.note && <p className="whitespace-pre-wrap text-sm text-slate-700"><strong>{text("Decision note","Motif de la décision")}</strong><br/>{refund.note}</p>}
  </article>;
}

export function Refunds({refunds, ...props}: Props & {refunds: Refund[]}) {
  const {text} = props;
  const [filter,setFilter] = useState("pending");
  const rows = refunds.filter(r=>filter === "all" || r.status === filter);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold"><RotateCcw className="size-5 text-teal-800" />{text("Refund requests","Demandes de remboursement")}</h2>
      <label className="flex items-center gap-2 text-sm">{text("Status","Statut")}<select className={fieldClass} value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="pending">{reviewLabel("pending",text)}</option><option value="approved">{reviewLabel("approved",text)}</option><option value="denied">{reviewLabel("denied",text)}</option><option value="all">{text("All decisions","Toutes les décisions")}</option>
      </select></label>
    </div>
    {rows.length ? rows.map(refund=><RefundRow key={refund.contact_id+"/"+refund.status} {...props} refund={refund}/>) : <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"><CircleCheck className="size-5 text-teal-700"/>{text("No refund requests with this status.","Aucune demande de remboursement avec ce statut.")}</div>}
  </section>;
}
