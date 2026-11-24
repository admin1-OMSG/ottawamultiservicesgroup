import { useRef, useState, type FormEvent } from "react";
import { Check, ChevronRight, MapPin, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { CustomerDirectory } from "./CustomerDirectory";
import { MarketBadges } from "./MarketBadges";
import { MarketConversation } from "./MarketConversation";
import { dateLabel,marketInput,marketPrimary,marketSecondary,serviceName,requestStatus,type DirectoryProvider,type MarketContact,type MarketRequest } from "./customer-model";

type Props={ request:MarketRequest; contacts:MarketContact[]; providers:DirectoryProvider[]; activeId?:string; select:(id:string)=>void; refresh:()=>Promise<unknown> };
export function CustomerRequestDetail({request,contacts,providers,activeId,select,refresh}:Props) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const active=contacts.find(c=>c.id===activeId);
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-semibold text-teal-800">{serviceName(request.service,language)}</div>
      <h2 className="mt-1 break-words text-2xl font-bold">{request.title}</h2></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">{requestStatus(request.status,language)}</span></div>
    <MarketBadges t={t} urgent={request.status==="open" && request.urgency==="asap"} detailsAdded={Boolean(request.details_updated_at)}/>
    <p className="my-3 flex flex-wrap items-center gap-2 text-sm text-slate-600"><MapPin size={15}/>{request.city} · {dateLabel(request.created_at,language)} · {request.urgency==="asap"?t("As soon as possible","Dès que possible"):request.urgency==="week"?t("Within a week","Dans la semaine"):t("Flexible dates","Dates flexibles")}</p>
    <p className="whitespace-pre-wrap break-words text-sm leading-6">{request.description}</p>
    {request.preferred_names?.length>0 && <p className="mt-4 text-sm"><b>{t("Invited professionals","Professionnels invités")}</b> · {request.preferred_names.join(", ")}</p>}
    {request.status==="open" && <>{request.is_owner && <AddDetails key={request.id} requestId={request.id} refresh={refresh}/>}<InviteExisting request={request} providers={providers} refresh={refresh}/><WithdrawRequest id={request.id} refresh={refresh}/></>}
    <div className="mt-6 border-t pt-5"><h3 className="flex items-center gap-2 text-lg font-bold"><MessageCircle size={19}/>{t("Professional replies","Réponses des professionnels")} ({contacts.length})</h3>
      {!contacts.length && <p className="mt-2 text-sm text-slate-600">{t("You’ll see a notification here when a professional contacts you.","Vous recevrez une notification ici dès qu’un professionnel vous contactera.")}</p>}
      <ul className="mt-3 grid gap-2">{contacts.map(c=><li key={c.id}><button className={"flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm font-semibold "+(c.id===activeId?"border-teal-700 bg-teal-50 text-teal-900":"border-slate-200")} onClick={()=>select(c.id)} aria-pressed={c.id===activeId}><span>{c.provider_name}<MarketBadges t={t} subscriber={c.provider_paid_subscriber} phoneVerified={c.provider_phone_verified}/></span><ChevronRight size={16}/></button></li>)}</ul>
    </div>
    {active && <section className="mt-5"><h3 className="text-lg font-bold">{t("Conversation with ","Échanges avec ")}{active.provider_name}</h3><MarketConversation contactId={active.id}/><JobReview key={active.id} contact={active} request={request} refresh={refresh}/></section>}
  </article>;
}

function AddDetails({requestId, refresh}: {requestId: string; refresh: () => Promise<unknown>}) {
  const {language} = useLanguage();
  const t = (en: string, fr: string) => language === "fr" ? fr : en;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"duplicate" | "closed" | "retry" | null>(null);
  const messages = {
    duplicate: t("These details already appear in your request. Add something new.", "Ces précisions figurent déjà dans votre demande. Ajoutez un nouveau détail."),
    closed: t("This request is closed. You can only add details to an open request.", "Cette demande est fermée. Vous pouvez ajouter des précisions à une demande ouverte."),
    retry: t("Could not confirm the update. Retry with the same details.", "Impossible de confirmer la mise à jour. Réessayez avec les mêmes précisions."),
  };
  const [saved, setSaved] = useState(false);
  const pending = useRef<{id: string; details: string} | null>(null);
  const lock = useRef(false);

  async function append(event: FormEvent) {
    event.preventDefault();
    const details = draft.trim();
    if (!details || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (pending.current?.details !== details) pending.current = {id: crypto.randomUUID(), details};
      const result = await supabase.rpc("market_add_request_details", {
        p_request_id: requestId, p_id: pending.current.id, p_details: details,
      });
      if (result.error?.message === "market_duplicate_details") {
        setError("duplicate");
        return;
      }
      if (result.error?.message === "market_request_closed") {
        setError("closed");
        return;
      }
      if (result.error) throw result.error;
      pending.current = null;
      setDraft("");
      setSaved(true);
      setOpen(false);
      void refresh().catch(() => undefined);
    } catch {
      setError("retry");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <div className="mt-4">
    <button className={marketSecondary} aria-expanded={open} disabled={busy} onClick={() => { setOpen(!open); setSaved(false); }}>
      {t("Add details", "Ajouter des précisions")}
    </button>
    {open && <form onSubmit={append} className="mt-3 space-y-2">
      <label className="block text-sm font-semibold">{t("New details for professionals", "Nouvelles précisions pour les professionnels")}
        <textarea className={marketInput} required rows={3} maxLength={2000} value={draft} disabled={busy || error === "closed"} onChange={e => {setDraft(e.target.value); setError(null);}} aria-describedby="request-update-help"/>
      </label>
      <p id="request-update-help" className="text-xs text-slate-600">{t("These details will appear in your request. Share contact information privately in a conversation.", "Ces précisions apparaîtront dans votre demande. Communiquez vos coordonnées en privé dans une conversation.")}</p>
      {error && <p role="alert" className="text-sm text-red-800">{messages[error]}</p>}
      <button className={marketPrimary} disabled={busy || !draft.trim() || error === "closed" || error === "duplicate"}>{t("Publish update", "Publier la mise à jour")}</button>
    </form>}
    {saved && <p role="status" className="mt-2 text-sm text-teal-800">{t("Your new details are published.", "Vos précisions sont publiées.")}</p>}
  </div>;
}

function JobReview({contact,request,refresh}:{contact:MarketContact;request:MarketRequest;refresh:()=>Promise<unknown>}) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const [confirm,setConfirm]=useState(false);
  const [rating,setRating]=useState("");
  const [body,setBody]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  async function act(review:boolean) {
    if(busy)return;
    setBusy(true);setError("");setSuccess("");
    try {
      const result=review ? await supabase.rpc("market_review",{p_contact_id:contact.id,p_rating:Number(rating),p_body:body.trim()}) :
        await supabase.rpc("market_complete",{p_contact_id:contact.id});
      if(result.error)throw result.error;
      await refresh();
      setSuccess(review?t("Review submitted.","Avis publié."):t("Job marked as completed.","Travail marqué comme réalisé."));
    } catch {setError(t("Could not confirm this change. Refresh your request and try again.","Impossible de confirmer cette modification. Actualisez la demande et réessayez."));}
    finally{setBusy(false);}
  }
  if(!contact.completed_at && request.status!=="open")return null;
  return <section className="mt-4 rounded-xl border border-slate-200 p-4">
    {contact.completed_at ? <>{contact.review_rating!=null ? <><h4 className="font-bold">{t("Your review","Votre avis")} · {contact.review_rating}/5</h4><p className="mt-2 whitespace-pre-wrap text-sm">{contact.review_body}</p></> :
      <form onSubmit={e=>{e.preventDefault();void act(true);}}><h4 className="font-bold">{t("Review this professional","Évaluer ce professionnel")}</h4><label className="mt-3 block text-sm font-semibold">{t("Rating","Note")}<select className={marketInput} required value={rating} onChange={e=>setRating(e.target.value)}><option value="">{t("Choose a rating","Choisir une note")}</option>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><label className="mt-3 block text-sm font-semibold">{t("Your review","Votre avis")}<textarea className={marketInput} maxLength={2000} rows={2} value={body} onChange={e=>setBody(e.target.value)}/></label><button className={marketPrimary+" mt-3"} disabled={busy}>{t("Publish review","Publier l’avis")}</button></form>}</> :
      confirm ? <><p className="text-sm">{t("Confirm that this professional completed the job. This closes the request and lets you leave a review.","Confirmez que ce professionnel a réalisé le travail. La demande sera clôturée et vous pourrez laisser un avis.")}</p><div className="mt-3 flex flex-wrap gap-2"><button className={marketPrimary} disabled={busy} onClick={()=>void act(false)}>{t("Confirm completion","Confirmer la réalisation")}</button><button className={marketSecondary} disabled={busy} onClick={()=>setConfirm(false)}>{t("Cancel","Annuler")}</button></div></> :
        <button className={marketSecondary} onClick={()=>setConfirm(true)}><Check size={16}/>{t("Mark work as completed","Indiquer que le travail est terminé")}</button>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}{success && <p role="status" className="mt-2 text-sm text-teal-800">{success}</p>}
  </section>;
}
function InviteExisting({request,providers,refresh}:{request:MarketRequest;providers:DirectoryProvider[];refresh:()=>Promise<unknown>}) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  const [success,setSuccess]=useState(false);
  const choices=providers.filter(p=>!request.preferred_ids.includes(p.id));
  const pending=selected.filter(id=>choices.some(p=>p.id===id));
  async function invite() {
    if(busy || !pending.length)return;
    setBusy(true);setError(false);setSuccess(false);
    try {
      for(const id of pending) {
        const r=await supabase.rpc("market_invite",{p_request_id:request.id,p_provider_id:id});
        if(r.error)throw r.error;
      }
      setOpen(false);setSelected([]);setSuccess(true);
    } catch {setError(true);}
    finally {await refresh();setBusy(false);}
  }
  return <div className="mt-4"><button className={marketSecondary} aria-expanded={open} onClick={()=>{setOpen(!open);setSuccess(false);}}>{t("Invite professionals","Inviter des professionnels")}</button>
    {open && <div className="mt-3 space-y-3"><CustomerDirectory providers={choices} selected={pending} onChange={setSelected}/>
    <button className={marketPrimary} disabled={busy||!pending.length} onClick={()=>void invite()}>{t("Send invitations","Envoyer les invitations")} ({pending.length})</button></div>}
    {success && <p role="status" className="mt-2 text-sm text-teal-800">{t("Invitations sent.","Invitations envoyées.")}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{t("Some invitations could not be confirmed. Try the remaining invitations again.","Certaines invitations n’ont pas pu être confirmées. Réessayez pour les professionnels restants.")}</p>}
  </div>;
}
function WithdrawRequest({id,refresh}:{id:string;refresh:()=>Promise<unknown>}) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  async function withdraw(){
    setBusy(true);setError(false);
    try {
      const result=await supabase.rpc("market_withdraw",{p_request_id:id});
      if(result.error)throw result.error;
      await refresh();
    }catch{setError(true);}finally{setBusy(false);}
  }
  return <div className="mt-3">{confirm ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm">{t("Withdraw this request? New professionals will no longer be able to contact you about it.","Retirer cette demande ? Les nouveaux professionnels ne pourront plus vous contacter à son sujet.")}</p><div className="mt-2 flex flex-wrap gap-2"><button className={marketSecondary} onClick={()=>void withdraw()} disabled={busy}>{t("Confirm withdrawal","Confirmer le retrait")}</button><button className={marketSecondary} disabled={busy} onClick={()=>setConfirm(false)}>{t("Keep request open","Garder la demande ouverte")}</button></div></div>:
    <button className="min-h-11 text-sm text-slate-600 underline" onClick={()=>setConfirm(true)}>{t("Withdraw request","Retirer la demande")}</button>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{t("Withdrawal could not be confirmed. Please retry.","Impossible de confirmer le retrait. Réessayez.")}</p>}</div>;
}
