import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, ClipboardList, LogOut, MapPin, Plus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LanguageSwitcher, useLanguage } from "@/lib/language";
import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";
import { MarketInbox, useMarketInbox } from "@/features/marketplace/MarketInbox";
import { readMarketRows } from "@/features/marketplace/market-read";
import { CustomerSignIn, MARKET_RETURN_KEY } from "@/features/marketplace/CustomerSignIn";
import { MarketBadges } from "@/features/marketplace/MarketBadges";
import { CustomerDirectory } from "@/features/marketplace/CustomerDirectory";
import { CustomerRequestForm } from "@/features/marketplace/CustomerRequestForm";
import { CustomerRequestDetail } from "@/features/marketplace/CustomerRequestDetail";
import { dateLabel, marketPrimary, marketSecondary, requestStatus, serviceName, type DirectoryProvider, type MarketContact, type MarketNotice, type MarketRequest } from "@/features/marketplace/customer-model";

type MarketSearch={contact?:string;request?:string;new?:number;category?:string;providers?:number};
const uuid=/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
export const Route = createFileRoute("/marketplace")({
  validateSearch:(s:Record<string,unknown>):MarketSearch=>({
    contact:typeof s.contact==="string"&&uuid.test(s.contact)?s.contact:undefined,
    request:typeof s.request==="string"&&uuid.test(s.request)?s.request:undefined,
    new:Number(s.new)===1?1:undefined,
    providers:Number(s.providers)===1?1:undefined,
    category:PROFESSIONAL_SERVICE_OPTIONS.find(({value})=>value===s.category)?.value,
  }),
  head:()=>({meta:[{title:"Service requests | Ottawa Multi Services Group"},{name:"robots",content:"noindex, nofollow"}]}),
  component:Marketplace,
});
function Marketplace(){
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const [session,setSession]=useState<Session|null|undefined>(undefined);
  const [authError,setAuthError]=useState(false);
  useEffect(()=>{
    let current=true;
    let observed=false;
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{observed=true;if(current)setSession(next);});
    void supabase.auth.getSession().then(({data,error})=>{
      if(current&&!observed){setSession(error?null:data.session);setAuthError(Boolean(error));}
    }).catch(()=>{if(current&&!observed){setSession(null);setAuthError(true);}});
    return ()=>{current=false;data.subscription.unsubscribe();};
  },[]);
  const user=session?.user;
  const verified=Boolean(user?.email_confirmed_at || user?.phone_confirmed_at);
  useEffect(()=>{
    if(!session || !verified)return;
    try{localStorage.removeItem(MARKET_RETURN_KEY);}catch{/* Storage can be disabled. */}
  },[session,verified]);
  return <div className="min-h-screen bg-[#f5f8f7] text-slate-950" data-i18n-ignore="true">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
      <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label={t("OMSG home","Accueil OMSG")}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f98413] font-extrabold text-slate-950">O</span><span className="min-w-0"><span className="block font-extrabold leading-tight">Ottawa MSG</span><span className="hidden text-[9px] font-semibold uppercase tracking-[.16em] text-slate-600 sm:block">Multi Services Group</span></span></a>
      <div className="flex items-center gap-2 sm:gap-4"><LanguageSwitcher compact/>{session && <button className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold" onClick={()=>{void supabase.auth.signOut({scope:"local"}).then(r=>setAuthError(Boolean(r.error))).catch(()=>setAuthError(true));}}><LogOut size={16}/>{t("Sign out","Déconnexion")}</button>}</div>
    </div></header>
    {authError && <p role="alert" className="mx-auto mt-4 max-w-5xl px-5 text-sm text-red-800">{t("There was a problem with your session. Refresh the page or sign in again.","Un problème de session est survenu. Actualisez la page ou reconnectez-vous.")}</p>}
    {session===undefined?<div role="status" className="mx-auto max-w-6xl px-5 py-10">{t("Opening your account…","Ouverture de votre espace…")}</div> :
      user && verified ? <Dashboard key={user.id} userId={user.id} phoneVerified={Boolean(user.phone && user.phone_confirmed_at)}/> : <CustomerSignIn/>}
    <footer className="mx-auto mt-8 flex max-w-6xl flex-wrap justify-between gap-3 border-t border-slate-200 px-5 py-6 text-xs text-slate-600 sm:px-8">
      <span>Ottawa Multiservices Group Inc.</span><div className="flex gap-4"><a href="/privacy" className="underline">{t("Privacy","Confidentialité")}</a><a href="/terms" className="underline">{t("Terms","Conditions")}</a></div></footer>
  </div>;
}
async function loadDashboard(){
  const [requests,contacts,directory]=await Promise.all([
    readMarketRows<MarketRequest>("market_requests",{}, {field:"is_owner",value:true}),
    readMarketRows<MarketContact>("market_my_contacts",{}, {field:"my_provider",value:false}),
    readMarketRows<DirectoryProvider>("market_directory")
  ]);
  const ownRequests=requests.filter(r=>r.is_owner);
  const ownIds=new Set(ownRequests.map(r=>r.id));
  return {requests:ownRequests,contacts:contacts.filter(c=>!c.my_provider&&ownIds.has(c.request_id)),directory};
}
function Dashboard({userId,phoneVerified}:{userId:string;phoneVerified:boolean}){
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const search=Route.useSearch();
  const navigate=Route.useNavigate();
  const go=(next:MarketSearch)=>{void navigate({search:next});};
  const [selected,setSelected]=useState<string[]>([]);
  const [notices,setNotices]=useState(false);
  const inbox=useMarketInbox(userId,false,notices);
  const [noticeError,setNoticeError]=useState("");
  const [published,setPublished]=useState("");
  const dashboard=useQuery({queryKey:["customer-market",userId],queryFn:loadDashboard,retry:1,refetchInterval:30000});
  useEffect(()=>{
    void Promise.resolve(supabase.rpc("market_touch")).catch(()=>undefined);
  },[userId]);
  const data=dashboard.data;
  const chosenContact=data?.contacts.find(c=>c.id===search.contact);
  const request=data?.requests.find(r=>r.id===(chosenContact?.request_id??search.request));
  const view=search.new || search.category ? "new" : search.providers ? "providers" : request ? "detail" : "requests";
  const unread=inbox.page.data?.unread??0;
  async function openNotice(notice:MarketNotice){
    setNoticeError("");
    const hasTarget=(snapshot:typeof data)=>snapshot?.requests.some(r=>r.id===notice.request_id)
      && (!notice.contact_id || snapshot.contacts.some(c=>c.id===notice.contact_id && c.request_id===notice.request_id));
    if(!hasTarget(data)){
      try{
        const refreshed=await dashboard.refetch({throwOnError:true});
        if(!hasTarget(refreshed.data)){
          setNoticeError(t("This request or conversation is no longer available.","Cette demande ou conversation n’est plus disponible."));return;
        }
      }
      catch{setNoticeError(t("Could not open this notification. Try again.","Impossible d’ouvrir cette notification. Réessayez."));return;}
    }
    go(notice.contact_id?{contact:notice.contact_id}:{request:notice.request_id});
    setNotices(false);
    try{await inbox.markRead(notice);}
    catch{setNoticeError(t("The notification may still appear as unread.","La notification pourrait encore apparaître comme non lue."));}
  }
  return <main className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("My service requests","Mes demandes de services")}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={15}/>Ottawa–Gatineau</p><MarketBadges t={t} repeatCustomer={data?.requests[0]?.repeat_client} phoneVerified={phoneVerified}/></div><div className="flex flex-wrap items-center gap-2"><button className={marketSecondary} aria-expanded={notices} onClick={()=>{inbox.first();setNotices(!notices);}}><Bell size={16}/>{t("Notifications","Notifications")}{unread>0 && <span className="rounded-full bg-teal-800 px-2 text-xs text-white">{unread}</span>}</button><button className={marketPrimary} onClick={()=>go({new:1})}><Plus size={18}/>{t("Create a request","Créer une demande")}</button></div></div>
    <nav aria-label={t("Customer dashboard","Espace client")} className="my-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <button className={view==="requests"||view==="detail"?marketPrimary:marketSecondary} aria-current={view==="requests"||view==="detail"?"page":undefined} onClick={()=>go({})}><ClipboardList size={16}/>{t("My requests","Mes demandes")}</button>
      <button className={view==="providers"?marketPrimary:marketSecondary} aria-current={view==="providers"?"page":undefined} onClick={()=>go({providers:1})}><Users size={16}/>{t("Find professionals","Choisir des professionnels")}</button>
    </nav>
    {noticeError && <p role="status" className="mb-4 text-sm text-slate-600">{noticeError}</p>}
    {notices && <MarketInbox inbox={inbox} language={language} t={t} onOpen={openNotice}/>}
    {dashboard.isPending && <p role="status">{t("Loading your dashboard…","Chargement de votre espace…")}</p>}
    {dashboard.isError && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{t("Your dashboard could not be loaded.","Votre tableau de bord n’a pas pu être chargé.")} <button className="font-bold underline" onClick={()=>void dashboard.refetch()}>{t("Retry","Réessayer")}</button></div>}
    {data && <>
      {view==="new" && <CustomerRequestForm key={search.category??""} category={search.category} providers={data.directory} preferred={selected} select={setSelected} onCreated={id=>{setSelected([]);setPublished(id);void dashboard.refetch().then(()=>go({request:id}));}}/>}
      {view==="providers" && <section className="rounded-2xl border bg-white p-5 sm:p-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{t("Choose professionals","Choisir des professionnels")}</h2><button className={marketPrimary} onClick={()=>go({new:1})}>{t("Create request","Créer une demande")}{selected.length>0?" ("+selected.length+")":""}<ArrowRight size={16}/></button></div><CustomerDirectory providers={data.directory} selected={selected} onChange={setSelected}/></section>}
      {view==="detail" && request && <><button onClick={()=>go({})} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-900"><ArrowLeft size={15}/>{t("All my requests","Toutes mes demandes")}</button>{published===request.id && <p role="status" className="mb-3 rounded-xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">{t("Your request is published.","Votre demande est publiée.")}</p>}<CustomerRequestDetail key={request.id} request={request} contacts={data.contacts.filter(c=>c.request_id===request.id)} providers={data.directory} activeId={chosenContact?.id} select={id=>go({contact:id})} refresh={dashboard.refetch}/></>}
      {view==="requests" && <section aria-label={t("My requests","Mes demandes")}>
        {(search.request||search.contact) && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">{t("This request or conversation isn’t available in your account.","Cette demande ou conversation n’est pas disponible dans votre compte.")}</p>}
        {!data.requests.length?<div className="rounded-2xl border border-dashed border-teal-300 bg-white px-6 py-10 text-center"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-teal-50 text-teal-800"><BriefcaseBusiness size={23}/></div><h2 className="text-2xl font-bold">{t("What do you need help with?","De quel service avez-vous besoin ?")}</h2><p className="mt-2 text-sm text-slate-600">{t("Create your first free request to hear from local professionals.","Créez votre première demande gratuite pour recevoir des réponses de professionnels locaux.")}</p><button className={marketPrimary+" mt-5"} onClick={()=>go({new:1})}>{t("Post my first request","Publier ma première demande")}<ArrowRight size={16}/></button></div>:
          <ul className="grid gap-4 md:grid-cols-2">{data.requests.map(r=><li key={r.id}><button className="flex h-full w-full flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-teal-600" onClick={()=>go({request:r.id})}><span className="flex w-full justify-between gap-3 text-xs font-bold text-teal-800"><span>{serviceName(r.service,language)}</span><span>{requestStatus(r.status,language)}</span></span><span className="mt-2 break-words text-lg font-bold">{r.title}</span><MarketBadges t={t} urgent={r.status==="open" && r.urgency==="asap"} detailsAdded={Boolean(r.details_updated_at)}/><span className="mt-2 text-sm text-slate-600">{r.city} · {dateLabel(r.created_at,language)}</span><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800">{data.contacts.filter(c=>c.request_id===r.id).length} {t("replies","réponses")} <ArrowRight size={15}/></span></button></li>)}</ul>}
      </section>}
    </>}
  </main>;
}
