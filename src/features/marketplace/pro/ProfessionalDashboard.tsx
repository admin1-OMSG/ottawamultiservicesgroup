import {useEffect,useRef,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Bell,Check,ChevronRight,Coins,Inbox,Layers3,LoaderCircle,MessagesSquare,WalletCards} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";
import {readMarketRows} from "../market-read";
import {LeadBoard} from "./LeadBoard";
import {RepliesPanel} from "./RepliesPanel";
import {WalletPanel} from "./WalletPanel";
import {credits,dateText,professionalDestination,forgetProfessionalDestination,type Language,type MarketAlert,type MarketLead,type Reply,type Translate,type Wallet} from "./model";

async function rpc<T>(name:string,args?:Record<string,unknown>):Promise<T> {
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  return data as T;
}
type Pane="leads"|"replies"|"wallet"|"alerts";
export function ProfessionalDashboard({userId,profileId,name,language,t}:{userId:string;profileId:string;name:string;language:Language;t:Translate}) {
  const [destination]=useState(professionalDestination);
  useEffect(()=>forgetProfessionalDestination(),[]);
  const [pane,setPane]=useState<Pane>(()=>destination.get("contact")?"replies":"leads");
  const [selectedLead,setSelectedLead]=useState<string|null>(()=>destination.get("lead"));
  const [selectedReply,setSelectedReply]=useState<string|null>(()=>destination.get("contact"));
  const [checkoutStatus,setCheckoutStatus]=useState(()=>destination.get("checkout"));
  const [fastRefresh,setFastRefresh]=useState(checkoutStatus==="success");
  const [busy,setBusy]=useState(false);
  const guard=useRef(false);
  const [failure,setFailure]=useState("");
  const [alertError,setAlertError]=useState(false);
  useEffect(()=>{
    void supabase.rpc("market_touch").then(()=>{});
    if(!fastRefresh)return;
    const timeout=window.setTimeout(()=>setFastRefresh(false),60000);
    return ()=>window.clearTimeout(timeout);
  },[userId,fastRefresh]);
  const data=useQuery({
    queryKey:["professional-market-desk",userId,profileId],retry:1,gcTime:0,refetchInterval:fastRefresh?4000:30000,
    queryFn:async()=>{
      const [leads,replies,wallet,alerts]=await Promise.all([
        readMarketRows<MarketLead>("market_requests",{},{field:"is_owner",value:false}),
        readMarketRows<Reply>("market_my_contacts",{},{field:"my_provider",value:true}),
        rpc<Wallet>("market_wallet"),
        readMarketRows<MarketAlert>("market_notifications")
      ]);
      const byRequest=new Map(leads.map(lead=>[lead.id,lead.status]));
      const ownReplies=replies.filter(row=>row.provider_id===profileId).map(row=>({...row,request_status:byRequest.get(row.request_id)}));
      const providerAlerts=alerts.filter(row=>row.kind==="invitation"||row.kind==="match"||(row.kind==="message"&&ownReplies.some(r=>r.id===row.contact_id)));
      return {leads,replies:ownReplies,wallet,alerts:providerAlerts};
    }
  });
  function clearSearch() {
    setCheckoutStatus(null);
    if(!window.location.search)return;
    const url=new URL(window.location.href);
    for(const key of ["lead","contact","checkout"])url.searchParams.delete(key);
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  }
  function openReply(id:string|null){clearSearch();setSelectedLead(null);setSelectedReply(id);setPane("replies");setFailure("");}
  function choose(id:string){setFailure("");setSelectedLead(id);}
  const loaded=data.data;
  const lead=loaded?.leads.find(row=>row.id===selectedLead&&!row.is_owner&&row.status==="open");
  const previous=loaded?.replies.find(row=>row.request_id===selectedLead);
  const cost=lead?.credit_cost??null;
  async function confirm() {
    if(!lead||cost===null||guard.current||previous||!loaded||loaded.wallet.balance<cost)return;
    guard.current=true;setBusy(true);setFailure("");
    try {
      const id=await rpc<string>("market_unlock",{p_request_id:lead.id,p_expected_cost:cost});
      if(typeof id!=="string"||!id)throw new Error("invalid_response");
      await data.refetch();openReply(id);
    }catch(error){
      const code=String((error as {message?:string})?.message??"");
      setFailure(code.includes("insufficient_credits")?t("Your credit balance has changed. Please check it below.","Votre solde a changé. Veuillez le vérifier ci-dessous."):code.includes("price_changed")?t("This request’s price has changed. Review the new price before confirming.","Le coût de cette demande a changé. Vérifiez le nouveau tarif avant de confirmer."):t("The contact could not be confirmed. Refresh and try again.","Le contact n’a pas pu être confirmé. Actualisez et réessayez."));
      await data.refetch();
    }finally{guard.current=false;setBusy(false);}
  }
  async function goAlert(alert:MarketAlert){
    setAlertError(false);
    if(alert.contact_id)openReply(alert.contact_id);
    else {setPane("leads");choose(alert.request_id);}
    if(!alert.read_at)try{await rpc("market_read_notification",{p_id:alert.id});await data.refetch();}catch{setAlertError(true);}
  }
  const unread=loaded?.alerts.filter(a=>!a.read_at).length??0;
  const controls=[["wallet",t("My credits","Mes crédits"),WalletCards],["alerts",t("Notifications","Notifications"),Bell]] as const;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-teal-800">{name||t("Professional account","Compte professionnel")}</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("Professional dashboard","Tableau de bord professionnel")}</h1></div><div className="flex flex-wrap gap-2">{controls.map(([id,label,Icon])=><Button key={id} variant={pane===id?"default":"outline"} aria-pressed={pane===id} onClick={()=>setPane(pane===id?"leads":id)}><Icon/>{id==="wallet"&&loaded?credits(loaded.wallet.balance,t):label}{id==="alerts"&&unread>0&&<span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-900">{unread}</span>}</Button>)}</div></div>
    <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label={t("Requests","Demandes")}>{([["leads",t("All requests","Toutes les demandes"),Layers3],["replies",t("My responses","Mes réponses"),MessagesSquare]] as const).map(([key,label,Icon])=><button type="button" key={key} aria-current={pane===key?"page":undefined} className={"inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold "+(pane===key?"border-teal-800 text-teal-900":"border-transparent text-slate-600 hover:text-teal-800")} onClick={()=>{setPane(key);setSelectedReply(null);}}><Icon size={16}/>{label}{key==="replies"&&!!loaded?.replies.length&&<span className="text-xs">({loaded.replies.length})</span>}</button>)}</nav>
    {checkoutStatus==="success"&&<p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{t("Your balance updates when the payment is confirmed. Review the request before confirming contact.","Votre solde sera actualisé après confirmation du paiement. Vérifiez la demande avant de confirmer le contact.")}</p>}
    {checkoutStatus==="simulated"&&<p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{t("You are back from the test checkout. Your wallet shows your available test credits.","Vous êtes de retour après le paiement simulé. Votre portefeuille affiche vos crédits d’essai disponibles.")}</p>}
    {checkoutStatus==="cancel"&&<p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("Checkout was cancelled.","Le paiement a été annulé.")}</p>}
    {alertError&&<p role="alert">{t("The notification could not be marked as read.","La notification n’a pas pu être marquée comme lue.")}</p>}
    {data.isPending?<p role="status" className="flex gap-2 text-sm"><LoaderCircle className="size-4 animate-spin"/>{t("Loading your requests…","Chargement de vos demandes…")}</p>:data.isError||!loaded?<div role="alert" className="rounded-2xl border bg-white p-5"><p>{t("Your dashboard could not be loaded.","Le tableau de bord n’a pas pu être chargé.")}</p><Button variant="outline" className="mt-2" onClick={()=>void data.refetch()}>{t("Try again","Réessayer")}</Button></div>:<>
      {pane==="leads"&&<LeadBoard leads={loaded.leads} replies={loaded.replies} language={language} t={t} choose={choose} openReply={openReply}/>}
      {pane==="replies"&&<RepliesPanel replies={loaded.replies} wallet={loaded.wallet} selected={selectedReply} open={openReply} language={language} t={t} reload={data.refetch}/>}
      {pane==="wallet"&&<section className="space-y-3"><h2 className="text-xl font-bold">{t("Credits and subscriptions","Crédits et abonnements")}</h2><WalletPanel wallet={loaded.wallet} t={t} language={language}/></section>}
      {pane==="alerts"&&<section className="space-y-3"><h2 className="text-xl font-bold">{t("Notifications","Notifications")}</h2>{!loaded.alerts.length&&<p className="flex items-center gap-2 rounded-xl border bg-white p-5 text-sm"><Inbox size={18}/>{t("You have no notifications yet.","Vous n’avez pas encore de notifications.")}</p>}{loaded.alerts.map(alert=><button key={alert.id} type="button" onClick={()=>void goAlert(alert)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-teal-700"><span className={"size-2 shrink-0 rounded-full "+(alert.read_at?"bg-slate-200":"bg-teal-700")}/><span className="flex-1"><strong className="block text-sm">{alert.kind==="invitation"?t("A client invited you","Un client vous a invité"):alert.kind==="message"?t("New message","Nouveau message"):t("A request matches your services","Une demande correspond à vos services")}</strong><span className="block text-sm text-slate-700">{loaded.leads.find(l=>l.id===alert.request_id)?.title}</span><span className="text-xs text-slate-500">{dateText(alert.created_at,language)}</span></span><ChevronRight size={16}/></button>)}</section>}
      <Dialog open={!!selectedLead} onOpenChange={open=>{if(!open&&!busy){clearSearch();setSelectedLead(null);setFailure("");}}}>
        <DialogContent data-i18n-ignore="true" className="max-h-[90dvh] overflow-y-auto rounded-2xl"><DialogTitle>{t("Contact client","Contacter le client")}</DialogTitle><DialogDescription>{lead?.title||previous?.request_title||t("This request is closed or unavailable.","Cette demande est fermée ou indisponible.")}</DialogDescription>
          {previous?<Button onClick={()=>openReply(previous.id)}>{t("Open conversation","Ouvrir la conversation")}<ChevronRight/></Button>:lead&&<><dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><dt>{t("Request cost","Coût de la demande")}</dt><dd className="font-bold">{cost!==null?credits(cost,t):t("Price pending","Tarif à venir")}</dd></div><div className="flex justify-between gap-4"><dt>{t("Available balance","Solde disponible")}</dt><dd className="font-bold">{credits(loaded.wallet.balance,t)}</dd></div></dl>
          {cost!==null&&(loaded.wallet.balance>=cost?<Button disabled={busy} onClick={()=>void confirm()}>{busy?<LoaderCircle className="animate-spin"/>:<Check/>}{t("Confirm contact","Confirmer le contact")}</Button>:<><p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Coins size={16}/>{t("Credits needed","Crédits manquants")} · {credits(cost-loaded.wallet.balance,t)}</p><WalletPanel packsOnly wallet={loaded.wallet} language={language} t={t} leadId={lead.id}/></>)}</>}
          {failure&&<p role="alert" className="text-sm text-red-800">{failure}</p>}
        </DialogContent>
      </Dialog>
    </>}
  </div>;
}
