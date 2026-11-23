import {useRef,useState} from "react";
import {ArrowLeft,ArrowUpRight,Mail,MessagesSquare,Phone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {MarketConversation} from "@/features/marketplace/MarketConversation";
import {supabase} from "@/lib/supabase";
import {credits,dateText,type Language,type Reply,type Translate,type Wallet} from "./model";

export function RepliesPanel({replies,wallet,selected,open,t,language,reload}:{replies:Reply[];wallet:Wallet;selected:string|null;open:(id:string|null)=>void;t:Translate;language:Language;reload:()=>Promise<unknown>}) {
  const reply=replies.find(row=>row.id===selected);
  if(reply) return <div className="space-y-4"><Button variant="ghost" onClick={()=>open(null)}><ArrowLeft/>{t("All my responses","Toutes mes réponses")}</Button>
    <article className="rounded-2xl border bg-white p-5"><h2 className="break-words text-xl font-bold">{reply.request_title}</h2><p className="mt-1 text-sm text-slate-600">{dateText(reply.created_at,language)} · {credits(reply.credit_cost,t)}{reply.request_status==="withdrawn" && " · "+t("Request withdrawn","Demande retirée")}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-teal-800">{reply.client_email && <a className="inline-flex items-center gap-1.5 break-all underline" href={"mailto:"+reply.client_email}><Mail size={14}/>{reply.client_email}</a>}{reply.client_phone && <a className="inline-flex items-center gap-1.5 underline" href={"tel:"+reply.client_phone}><Phone size={14}/>{reply.client_phone}</a>}</div>
      <div className="mt-4 border-t pt-4"><MarketConversation key={reply.id} contactId={reply.id}/></div>
    </article>
    <RefundPanel key={reply.id} reply={reply} refund={wallet.refunds.find(row=>row.contact_id===reply.id)} t={t} reload={reload}/>
  </div>;
  if (selected) return <div className="space-y-3">
    <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">{t("This conversation isn’t available in your account.", "Cette conversation n’est pas disponible dans votre compte.")}</p>
    <Button variant="outline" onClick={()=>open(null)}><ArrowLeft/>{t("All my responses","Toutes mes réponses")}</Button>
  </div>;
  return <section className="space-y-3">{!replies.length && <div className="rounded-2xl border bg-white p-8 text-center"><MessagesSquare className="mx-auto mb-3 text-teal-700"/><h2 className="font-semibold">{t("You haven’t contacted any clients yet.","Vous n’avez encore contacté aucun client.")}</h2></div>}
    {replies.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5"><div><h2 className="break-words font-bold">{item.request_title}</h2><p className="mt-1 text-sm text-slate-600">{dateText(item.created_at,language)} · {credits(item.credit_cost,t)}{item.request_status==="withdrawn" && " · "+t("Request withdrawn","Demande retirée")}{item.completed_at && " · "+t("Completed","Terminé")}</p></div><Button variant="outline" onClick={()=>open(item.id)}>{t("Open conversation","Ouvrir la conversation")}<ArrowUpRight/></Button></article>)}</section>;
}

function RefundPanel({reply,refund,t,reload}:{reply:Reply;refund?:Wallet["refunds"][number];t:Translate;reload:()=>Promise<unknown>}) {
  const [opened,setOpened]=useState(false);
  const [reason,setReason]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [failed,setFailed]=useState(false);
  const guard=useRef(false);
  const status=refund?.status||(sent?"pending":undefined);
  if(status){
    const labels:Record<string,string>={pending:t("Refund under review","Remboursement en cours d’examen"),approved:t("Credits refunded","Crédits remboursés"),denied:t("Refund declined","Remboursement refusé")};
    return <p role="status" className="text-sm font-semibold text-slate-700">{labels[status]??status}{refund?.note && <span className="mt-1 block break-words font-normal">{refund.note}</span>}</p>;
  }
  return <div className="rounded-xl border bg-white p-4"><button type="button" aria-expanded={opened} onClick={()=>setOpened(old=>!old)} className="font-semibold text-teal-800 underline">{t("Request a credit refund","Demander un remboursement de crédits")}</button>
    {opened && <form className="mt-3 grid max-w-md gap-3" onSubmit={async event=>{
      event.preventDefault();if(!reason||guard.current)return;
      guard.current=true;setBusy(true);setFailed(false);
      try{const {error}=await supabase.rpc("market_request_refund",{p_contact_id:reply.id,p_reason:reason,p_note:note.trim()});if(error)throw error;setSent(true);await reload();}
      catch{setFailed(true);}finally{guard.current=false;setBusy(false);}
    }}>
      <label className="text-sm font-medium">{t("Reason","Motif")}<select className="mt-1 block w-full rounded-lg border p-2 text-sm" required value={reason} onChange={e=>setReason(e.target.value)}><option value="">{t("Choose a reason","Choisir un motif")}</option><option value="invalid_phone">{t("The phone number does not exist","Le numéro de téléphone n’existe pas")}</option><option value="request_in_error">{t("The client posted the request by mistake","Le client a créé la demande par erreur")}</option></select></label>
      <label className="text-sm font-medium">{t("Details for OMSG (optional)","Précisions pour OMSG (facultatif)")}<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} className="mt-1 block w-full rounded-lg border p-2" rows={2}/></label>
      <Button disabled={busy||!reason}>{t("Send for review","Soumettre à l’administrateur")}</Button>
      {failed && <p role="alert" className="text-sm text-red-800">{t("We couldn’t submit your request. Try again.","La demande n’a pas pu être envoyée. Veuillez réessayer.")}</p>}
    </form>}
  </div>;
}
