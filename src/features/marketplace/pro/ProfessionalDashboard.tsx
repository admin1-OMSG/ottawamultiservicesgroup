import {useEffect,useRef,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Bell,Check,ChevronRight,Coins,Layers3,LoaderCircle,MessagesSquare,WalletCards} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";
import {MarketBadges,RequestBadges} from "../MarketBadges";
import {MarketInbox,useMarketInbox} from "../MarketInbox";
import type {MarketNotice} from "../customer-model";
import {readMarketRows} from "../market-read";
import {LeadBoard} from "./LeadBoard";
import {RepliesPanel} from "./RepliesPanel";
import {WalletPanel} from "./WalletPanel";
import {credits,professionalDestination,forgetProfessionalDestination,type Language,type MarketLead,type Reply,type Translate,type Wallet} from "./model";

async function rpc<T>(name:string,args?:Record<string,unknown>):Promise<T> {
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  return data as T;
}
type Pane="leads"|"replies"|"wallet"|"alerts";
export function ProfessionalDashboard({userId,profileId,name,language,t}:{userId:string;profileId:string;name:string;language:Language;t:Translate}) {
  const [destination]=useState(professionalDestination);
  useEffect(()=>forgetProfessionalDestination(),[]);
  const [pane,setPane]=useState<Pane>(() => {
    if (destination.has("contact")) return "replies";
    if (destination.has("lead")) return "leads";
    return destination.has("offer") || destination.has("checkout") ? "wallet" : "leads";
  });
  const [selectedLead,setSelectedLead]=useState<string|null>(()=>destination.get("lead"));
  const [selectedReply,setSelectedReply]=useState<string|null>(()=>destination.get("contact"));
  const [checkoutStatus,setCheckoutStatus]=useState(()=>destination.get("checkout"));
  const [fastRefresh,setFastRefresh]=useState(checkoutStatus==="success");
  const [busy,setBusy]=useState(false);
  const guard=useRef(false);
  const [failure,setFailure]=useState("");
  const inbox=useMarketInbox(userId,true,pane==="alerts");
  const [alertError,setAlertError]=useState("");
  useEffect(()=>{
    void supabase.rpc("market_touch").then(()=>{});
    if(!fastRefresh)return;
    const timeout=window.setTimeout(()=>setFastRefresh(false),60000);
    return ()=>window.clearTimeout(timeout);
  },[userId,fastRefresh]);
  const wallet=useQuery({
    queryKey:["professional-market-wallet",userId,profileId],retry:1,gcTime:0,refetchInterval:fastRefresh?4000:30000,
    queryFn:()=>rpc<Wallet>("market_wallet"),
  });
  const data=useQuery({
    queryKey:["professional-market-desk",userId,profileId],enabled:pane!=="wallet",retry:1,gcTime:0,refetchInterval:30000,
    queryFn:async()=>{
      const [leads,replies]=await Promise.all([
        readMarketRows<MarketLead>("market_requests",{},{field:"is_owner",value:false}),
        readMarketRows<Reply>("market_my_contacts",{},{field:"my_provider",value:true})
      ]);
      const byRequest=new Map(leads.map(lead=>[lead.id,lead]));
      const ownReplies=replies.filter(row=>row.provider_id===profileId).map(row=>({...row,request:byRequest.get(row.request_id)}));
      return {leads,replies:ownReplies};
    }
  });
  function clearSearch() {
    setCheckoutStatus(null);
    if(!window.location.search)return;
    const url=new URL(window.location.href);
    for(const key of ["lead","contact","checkout","offer"])url.searchParams.delete(key);
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  }
  function openReply(id:string|null){clearSearch();setSelectedLead(null);setSelectedReply(id);setPane("replies");setFailure("");}
  function choose(id:string){setFailure("");setSelectedLead(id);}
  const loaded=data.data && wallet.data ? {...data.data,wallet:wallet.data} : undefined;
  const refreshDashboard=()=>Promise.all([data.refetch(),wallet.refetch()]);
  const lead=loaded?.leads.find(row=>row.id===selectedLead&&!row.is_owner&&row.status==="open");
  const previous=loaded?.replies.find(row=>row.request_id===selectedLead);
  const cost=lead?.credit_cost??null;
  async function confirm() {
    if(!lead||cost===null||guard.current||previous||!loaded||loaded.wallet.balance<cost)return;
    guard.current=true;setBusy(true);setFailure("");
    try {
      const id=await rpc<string>("market_unlock",{p_request_id:lead.id,p_expected_cost:cost});
      if(typeof id!=="string"||!id)throw new Error("invalid_response");
      await refreshDashboard();openReply(id);
    }catch(error){
      const code=String((error as {message?:string})?.message??"");
      setFailure(code.includes("insufficient_credits")?t("Your credit balance has changed. Please check it below.","Votre solde a changé. Veuillez le vérifier ci-dessous."):code.includes("price_changed")?t("This request’s price has changed. Review the new price before confirming.","Le coût de cette demande a changé. Vérifiez le nouveau tarif avant de confirmer."):t("The contact could not be confirmed. Refresh and try again.","Le contact n’a pas pu être confirmé. Actualisez et réessayez."));
      await refreshDashboard();
    }finally{guard.current=false;setBusy(false);}
  }
  async function goAlert(alert:MarketNotice){
    setAlertError("");
    const hasTarget=(snapshot:typeof data.data)=>alert.contact_id
      ? snapshot?.replies.some(r=>r.id===alert.contact_id && r.request_id===alert.request_id)
      : snapshot?.leads.some(l=>l.id===alert.request_id && l.status==="open");
    if(!hasTarget(loaded)){
      try{
        const refreshed=await data.refetch({throwOnError:true});
        if(!hasTarget(refreshed.data)){
          setAlertError(t("This request or conversation is no longer available.","Cette demande ou conversation n’est plus disponible."));return;
        }
      }
      catch{setAlertError(t("Could not open this notification. Try again.","Impossible d’ouvrir cette notification. Réessayez."));return;}
    }
    if(alert.contact_id)openReply(alert.contact_id);
    else {setPane("leads");choose(alert.request_id);}
    try{await inbox.markRead(alert);}
    catch{setAlertError(t("The notification could not be marked as read.","La notification n’a pas pu être marquée comme lue."));}
  }
  const unread=inbox.page.data?.unread??0;
  const controls=[["wallet",t("My credits","Mes crédits"),WalletCards],["alerts",t("Notifications","Notifications"),Bell]] as const;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><div className="mb-2 flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.15em] text-teal-800">{name||t("Professional account","Compte professionnel")}</p><MarketBadges t={t} subscriber={wallet.data?.paid_subscriber} phoneVerified={wallet.data?.phone_verified}/></div><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("Professional dashboard","Tableau de bord professionnel")}</h1></div><div className="flex flex-wrap gap-2">{controls.map(([id,label,Icon])=><Button key={id} variant={pane===id?"default":"outline"} aria-pressed={pane===id} onClick={()=>{if(id==="alerts")inbox.first();setPane(pane===id?"leads":id);}}><Icon/>{id==="wallet"&&wallet.data?label+" · "+credits(wallet.data.balance,t):label}{id==="alerts"&&unread>0&&<span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-900">{unread}</span>}</Button>)}</div></div>
    <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label={t("Requests","Demandes")}>{([["leads",t("All requests","Toutes les demandes"),Layers3],["replies",t("My responses","Mes réponses"),MessagesSquare]] as const).map(([key,label,Icon])=><button type="button" key={key} aria-current={pane===key?"page":undefined} className={"inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold "+(pane===key?"border-teal-800 text-teal-900":"border-transparent text-slate-600 hover:text-teal-800")} onClick={()=>{setPane(key);setSelectedReply(null);}}><Icon size={16}/>{label}{key==="replies"&&!!loaded?.replies.length&&<span className="text-xs">({loaded.replies.length})</span>}</button>)}</nav>
    {checkoutStatus==="success"&&<p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{t("Your balance updates when the payment is confirmed.","Votre solde sera actualisé après confirmation du paiement.")}</p>}
    {checkoutStatus==="simulated"&&<p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{t("You are back from the test checkout. Your wallet shows your available test credits.","Vous êtes de retour après le paiement simulé. Votre portefeuille affiche vos crédits d’essai disponibles.")}</p>}
    {checkoutStatus==="cancel"&&<p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("Checkout was cancelled.","Le paiement a été annulé.")}</p>}
    {alertError&&<p role="alert">{alertError}</p>}
    {pane==="alerts"&&<MarketInbox inbox={inbox} language={language} t={t} onOpen={goAlert}/>}
    {pane==="wallet"&&<section className="space-y-3">
      <h2 className="text-xl font-bold">{t("Credits and subscriptions","Crédits et abonnements")}</h2>
      {wallet.isPending?<p role="status">{t("Loading your wallet…","Chargement de votre portefeuille…")}</p>:wallet.isError||!wallet.data?<div role="alert"><p>{t("Your wallet could not be loaded.","Votre portefeuille n’a pas pu être chargé.")}</p><Button variant="outline" onClick={()=>void wallet.refetch()}>{t("Try again","Réessayer")}</Button></div>:<WalletPanel wallet={wallet.data} t={t} language={language} selectedCode={destination.get("offer")}/>}
    </section>}
    {pane==="alerts"||pane==="wallet"?null:(data.isPending||wallet.isPending)?<p role="status" className="flex gap-2 text-sm"><LoaderCircle className="size-4 animate-spin"/>{t("Loading your requests…","Chargement de vos demandes…")}</p>:data.isError||wallet.isError||!loaded?<div role="alert" className="rounded-2xl border bg-white p-5"><p>{t("Your dashboard could not be loaded.","Le tableau de bord n’a pas pu être chargé.")}</p><Button variant="outline" className="mt-2" onClick={()=>void refreshDashboard()}>{t("Try again","Réessayer")}</Button></div>:<>
      {pane==="leads"&&<LeadBoard leads={loaded.leads} replies={loaded.replies} language={language} t={t} choose={choose} openReply={openReply}/>}
      {pane==="replies"&&<RepliesPanel replies={loaded.replies} wallet={loaded.wallet} selected={selectedReply} open={openReply} language={language} t={t} reload={refreshDashboard}/>}
      <Dialog open={!!selectedLead} onOpenChange={open=>{if(!open&&!busy){clearSearch();setSelectedLead(null);setFailure("");}}}>
        <DialogContent data-i18n-ignore="true" className="max-h-[90dvh] overflow-y-auto rounded-2xl"><DialogTitle>{t("Contact client","Contacter le client")}</DialogTitle><DialogDescription>{lead?.title||previous?.request_title||t("This request is closed or unavailable.","Cette demande est fermée ou indisponible.")}</DialogDescription>
          {previous?<Button onClick={()=>openReply(previous.id)}>{t("Open conversation","Ouvrir la conversation")}<ChevronRight/></Button>:lead&&<><RequestBadges request={lead} t={t}/><p className="whitespace-pre-line break-words text-sm text-slate-700">{lead.description}</p><dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><dt>{t("Request cost","Coût de la demande")}</dt><dd className="font-bold">{cost!==null?credits(cost,t):t("Price pending","Tarif à venir")}</dd></div><div className="flex justify-between gap-4"><dt>{t("Available balance","Solde disponible")}</dt><dd className="font-bold">{credits(loaded.wallet.balance,t)}</dd></div></dl>
          {cost!==null&&(loaded.wallet.balance>=cost?<Button disabled={busy} onClick={()=>void confirm()}>{busy?<LoaderCircle className="animate-spin"/>:<Check/>}{t("Confirm contact","Confirmer le contact")}</Button>:<><p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Coins size={16}/>{t("Credits needed","Crédits manquants")} · {credits(cost-loaded.wallet.balance,t)}</p><WalletPanel packsOnly wallet={loaded.wallet} language={language} t={t} leadId={lead.id}/></>)}</>}
          {failure&&<p role="alert" className="text-sm text-red-800">{failure}</p>}
        </DialogContent>
      </Dialog>
    </>}
  </div>;
}
