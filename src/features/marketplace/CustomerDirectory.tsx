import { useState } from "react";
import { MapPin, BadgeCheck, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language";
import { readMarketRows } from "./market-read";
import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";
import { GoogleProfileReviews } from "@/features/professionals/GoogleProfileReviews";
import { dateLabel, marketInput, marketSecondary, serviceName, type DirectoryProvider } from "./customer-model";

type Props = { providers: DirectoryProvider[]; selected: string[]; onChange: (ids: string[])=>void };
export function CustomerDirectory({providers, selected, onChange}:Props) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const [category,setCategory]=useState("");
  const [activity,setActivity]=useState("all");
  const [verification,setVerification]=useState("all");
  const [order,setOrder]=useState("name");
  const [area,setArea]=useState("");
  const [details,setDetails]=useState("");
  const now=Date.now();
  const filtered=providers.filter(p=>
    (!category || p.services.includes(category)) &&
    (activity==="all" || (p.active_at && now - Date.parse(p.active_at) <= 86400000*Number(activity))) &&
    (verification==="all" || p.review_status==="approved") &&
    (!area.trim() || [p.city,...p.service_areas].some(a=>a.toLocaleLowerCase().includes(area.trim().toLocaleLowerCase())))
  ).sort((a,b)=>(order==="jobs" ? b.completed_count-a.completed_count : order==="reviews" ? b.review_count-a.review_count : 0) || a.name.localeCompare(b.name,language));
  return <div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-semibold">{t("Service","Service")}<select className={marketInput} value={category} onChange={e=>setCategory(e.target.value)}><option value="">{t("All services","Tous les services")}</option>{PROFESSIONAL_SERVICE_OPTIONS.map(s=><option key={s.value} value={s.value}>{s[language]}</option>)}</select></label>
      <label className="text-sm font-semibold">{t("Service area","Zone desservie")}<input className={marketInput} value={area} onChange={e=>setArea(e.target.value)} placeholder={t("City or neighbourhood","Ville ou quartier")}/></label>
      <label className="text-sm font-semibold">{t("Verification","Vérification")}<select className={marketInput} value={verification} onChange={e=>setVerification(e.target.value)}><option value="all">{t("All profiles","Tous les profils")}</option><option value="approved">{t("Application approved","Dossier approuvé")}</option></select></label>
      <label className="text-sm font-semibold">{t("Last active","Dernière activité")}<select className={marketInput} value={activity} onChange={e=>setActivity(e.target.value)}><option value="all">{t("Any time","En tout temps")}</option><option value="7">{t("Past 7 days","7 derniers jours")}</option><option value="30">{t("Past 30 days","30 derniers jours")}</option></select></label>
      <label className="text-sm font-semibold">{t("Sort by","Trier par")}<select className={marketInput} value={order} onChange={e=>setOrder(e.target.value)}><option value="name">{t("Name","Nom")}</option><option value="jobs">{t("Most completed jobs","Nombre de travaux réalisés")}</option><option value="reviews">{t("Most OMSG reviews","Nombre d’avis OMSG")}</option></select></label>
    </div>
    {filtered.length===0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t("No professionals match these filters. You can still publish your request.","Aucun professionnel ne correspond à ces filtres. Vous pouvez quand même publier votre demande.")}</p>}
    <ul className="grid gap-3">{filtered.map(p=><li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{p.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin size={14}/>{p.city}</p></div>
      <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800"><BadgeCheck size={14}/>{t("Application approved","Dossier approuvé")}</span></div>
      <p className="mt-3 text-sm">{p.services.map(k=>serviceName(k,language)).join(" · ")}</p>
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600"><div><dt className="sr-only">{t("Completed jobs","Travaux réalisés")}</dt><dd>{p.completed_count} {t("jobs completed","travaux réalisés")}</dd></div><div><dt className="sr-only">{t("Reviews","Avis")}</dt><dd>{p.average_rating!=null && Number(p.average_rating).toLocaleString(language,{maximumFractionDigits:1})+" / 5 · "}{p.review_count} {t("OMSG reviews","avis OMSG")}</dd></div>{p.active_at && <div><dt className="inline">{t("Active ","Actif le ")}</dt><dd className="inline">{dateLabel(p.active_at,language)}</dd></div>}</dl>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-900"><input type="checkbox" className="size-4 accent-teal-800" checked={selected.includes(p.id)} onChange={e=>onChange(e.target.checked ? [...selected,p.id] : selected.filter(id=>id!==p.id))}/>{t("Invite to my request","Inviter pour ma demande")}</label>
      <button type="button" aria-expanded={details===p.id} className={marketSecondary} onClick={()=>setDetails(details===p.id?"":p.id)}>{t("Profile and reviews","Profil et avis")}</button></div>
      {details===p.id && <div className="mt-4 space-y-3 border-t pt-4">{p.service_areas.length>0 && <p className="text-sm">{t("Serves ","Dessert ")}{p.service_areas.join(", ")}</p>}<ProviderReviews id={p.id}/><GoogleProfileReviews listingUrl={p.google_maps_url}/></div>}
    </li>)}</ul>
  </div>;
}
function ProviderReviews({id}:{id:string}) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const q=useQuery({queryKey:["market-provider-reviews",id],queryFn:()=>readMarketRows<{rating:number;body:string;created_at:string}>("market_reviews",{p_provider_id:id})});
  return <section><h4 className="font-semibold">{t("OMSG client reviews","Avis des clients OMSG")}</h4>
    {q.isPending && <p className="text-sm">{t("Loading…","Chargement…")}</p>}{q.isError && <button type="button" className="text-sm underline" onClick={()=>void q.refetch()}>{t("Reviews unavailable. Retry","Avis indisponibles. Réessayer")}</button>}
    {q.data?.length===0 && <p className="text-sm text-slate-600">{t("No OMSG reviews yet.","Aucun avis OMSG pour le moment.")}</p>}
    {q.data?.map((r,i)=><article key={r.created_at+i} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm"><div className="flex items-center gap-2"><Star size={14} aria-hidden="true"/><b>{r.rating}/5</b><time>{dateLabel(r.created_at,language)}</time></div><p className="mt-1 whitespace-pre-wrap break-words">{r.body}</p></article>)}</section>;
}
