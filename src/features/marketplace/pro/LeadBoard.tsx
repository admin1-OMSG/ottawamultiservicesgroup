import {useState} from "react";
import {Activity,ArrowUpRight,CalendarDays,CheckCheck,Coins,ListFilter,MapPin,SearchX,Zap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {PROFESSIONAL_SERVICE_OPTIONS} from "@/features/professionals/model";
import {credits,dateText,defaultFilters,serviceName,urgencyName,visibleLeads,type Filters,type Language,type MarketLead,type Reply,type Translate} from "./model";

const control="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-800";
export function LeadBoard({leads,replies,language,t,choose,openReply}:{
  leads:MarketLead[];replies:Reply[];language:Language;t:Translate;choose:(id:string)=>void;openReply:(id:string)=>void;
}) {
  const [filters,setFilters]=useState<Filters>(defaultFilters);
  const [limit,setLimit]=useState(20);
  const [showFilters,setShowFilters]=useState(false);
  const filtered=visibleLeads(leads,filters,language);
  function set<K extends keyof Filters>(key:K,value:Filters[K]) {setFilters(old=>({...old,[key]:value}));setLimit(20);}
  const fields=[
    {key:"category",label:t("Service","Catégorie de service"),options:PROFESSIONAL_SERVICE_OPTIONS.map(item=>[item.value,item[language]])},
    {key:"urgency",label:t("Urgency","Urgence"),options:(["asap","week","flexible"] as const).map(value=>[value,urgencyName(value,t)])},
    {key:"verified",label:t("Verified contact","Coordonnées vérifiées"),options:[["email",t("Email","Courriel")],["phone",t("Phone","Téléphone")],["both",t("Email and phone","Courriel et téléphone")]]},
    {key:"active",label:t("Client activity","Activité du client"),options:[["1",t("Last 24 hours","Dernières 24 heures")],["7",t("Last 7 days","7 derniers jours")]]},
    {key:"age",label:t("Date posted","Ancienneté"),options:[["1",t("Last 24 hours","Dernières 24 heures")],["7",t("Last 7 days","7 derniers jours")],["30",t("Last 30 days","30 derniers jours")]]}
  ] as const;
  const sorting=[["newest",t("Newest first","Plus récentes")],["oldest",t("Oldest first","Plus anciennes")],["category",t("Service category","Catégorie de service")],["urgency",t("Urgency","Urgence")],["active",t("Recent client activity","Activité récente du client")],["verified",t("Most verified contacts","Coordonnées vérifiées")]];
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{filtered.length} {filtered.length===1?t("request","demande"):t("requests","demandes")}</h2><div className="flex flex-wrap items-center gap-2"><Button variant="outline" aria-expanded={showFilters} onClick={()=>setShowFilters(old=>!old)}><ListFilter/>{t("Filters","Filtres")}{fields.some(v=>filters[v.key]) && " •"}</Button><label><span className="sr-only">{t("Sort by","Trier par")}</span><select className="rounded-md border bg-white p-2 text-sm" value={filters.sort} onChange={e=>set("sort",e.target.value as Filters["sort"])}>{sorting.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div></div>
    {showFilters && <div className="rounded-xl border bg-white p-4"><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{fields.map(({key,label,options})=><label key={key} className="min-w-0 text-xs font-semibold text-slate-600">{label}<select className={control} value={filters[key]} onChange={e=>set(key,e.target.value)}><option value="">{t("All","Tous")}</option>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}</div><button className="mt-3 text-xs font-bold text-teal-800 underline" onClick={()=>{setFilters(defaultFilters);setLimit(20);}}>{t("Clear filters","Effacer les filtres")}</button></div>}
    {!filtered.length && <div className="rounded-2xl border bg-white p-8 text-center"><SearchX className="mx-auto mb-3 size-7 text-teal-700"/><p className="font-semibold">{fields.some(v=>filters[v.key])?t("No requests match these filters.","Aucune demande ne correspond à ces filtres."):t("No open requests yet.","Aucune demande ouverte pour le moment.")}</p></div>}
    <div className="grid gap-3">{filtered.slice(0,limit).map(lead=>{
      const reply=replies.find(item=>item.request_id===lead.id);
      return <article key={lead.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-900">{serviceName(lead.service,language)}</span>{lead.invited && <span className="text-xs font-bold text-amber-800">{t("Client invitation","Invitation du client")}</span>}</div><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={14}/>{dateText(lead.created_at,language)}</span></div>
        <h3 className="mt-3 break-words text-xl font-bold tracking-tight">{lead.title}</h3><p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{lead.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-1"><MapPin size={14}/>{lead.city}</span><span className="inline-flex items-center gap-1"><Zap size={14}/>{urgencyName(lead.urgency,t)}</span>{lead.client_active_at && <span className="inline-flex items-center gap-1"><Activity size={14}/>{t("Client active","Client actif")} · {dateText(lead.client_active_at,language)}</span>}{(lead.email_verified||lead.phone_verified) && <span className="inline-flex items-center gap-1"><CheckCheck size={14}/>{lead.email_verified&&lead.phone_verified?t("Email and phone verified","Courriel et téléphone vérifiés"):lead.phone_verified?t("Phone verified","Téléphone vérifié"):t("Email verified","Courriel vérifié")}</span>}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4"><strong className="inline-flex items-center gap-2 text-sm"><Coins size={16} className="text-amber-700"/>{lead.credit_cost===null?t("Price pending","Tarif à venir"):credits(lead.credit_cost,t)}</strong><Button disabled={!reply && lead.credit_cost===null} onClick={()=>reply?openReply(reply.id):choose(lead.id)}>{reply?t("Open conversation","Ouvrir la conversation"):t("Contact client","Contacter le client")}<ArrowUpRight/></Button></div>
      </article>;
    })}</div>
    {filtered.length>limit && <Button variant="outline" onClick={()=>setLimit(n=>n+20)}>{t("Show more requests","Afficher plus de demandes")}</Button>}
  </section>;
}
