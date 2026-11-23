import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Users } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";
import { CustomerDirectory } from "./CustomerDirectory";
import { marketInput, marketPrimary, type DirectoryProvider } from "./customer-model";

type Props={
  category?:string; providers:DirectoryProvider[];
  preferred:string[]; select:(ids:string[])=>void; onCreated:(id:string)=>void;
};
export function CustomerRequestForm({category,providers,preferred,select,onCreated}:Props) {
  const {language}=useLanguage();
  const t=(en:string,fr:string)=>language==="fr"?fr:en;
  const [service,setService]=useState(category??"");
  const [city,setCity]=useState("");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [urgency,setUrgency]=useState("flexible");
  const [showDirectory,setShowDirectory]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const key=useRef("");
  const lock=useRef(false);
  const selected=providers.filter(p=>preferred.includes(p.id));
  async function submit(e:FormEvent) {
    e.preventDefault();
    if(lock.current)return;
    lock.current=true; setBusy(true);setError("");
    try {
      if(!key.current)key.current=crypto.randomUUID();
      const {data,error}=await supabase.rpc("market_create_request",{
        p_id:key.current,p_service:service,p_city:city.trim(),p_title:title.trim(),p_description:body.trim(),
        p_urgency:urgency,p_preferred_ids:selected.map(p=>p.id)
      });
      if(error)throw error;
      onCreated(String(data));
    } catch {setError(t("We couldn’t confirm publication. Check your details and retry. Your draft is still here.","La publication n’a pas pu être confirmée. Vérifiez les champs et réessayez. Votre brouillon est conservé ici."));}
    finally {lock.current=false;setBusy(false);}
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <h2 className="text-2xl font-bold">{t("Create a request","Créer une demande")}</h2>
    <p className="mt-2 text-sm text-slate-600">{t("Local professionals offering this service can respond to your request.","Les professionnels de votre région qui offrent ce service pourront répondre à votre demande.")}</p>
    <form className="mt-6 space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">{t("Service category","Catégorie de service")}<select required className={marketInput} value={service} onChange={e=>setService(e.target.value)}><option value="">{t("Choose a service","Choisir un service")}</option>{PROFESSIONAL_SERVICE_OPTIONS.map(s=><option key={s.value} value={s.value}>{s[language]}</option>)}</select></label>
        <label className="text-sm font-semibold">{t("City or neighbourhood","Ville ou quartier")}<input required maxLength={100} className={marketInput} value={city} onChange={e=>setCity(e.target.value)} placeholder={t("e.g. Orléans","p. ex. Orléans")}/></label></div>
      <label className="block text-sm font-semibold">{t("Request title","Titre de la demande")}<input required maxLength={160} className={marketInput} value={title} onChange={e=>setTitle(e.target.value)} placeholder={t("e.g. Move a two-bedroom apartment","p. ex. Déménager un appartement de deux chambres")}/></label>
      <label className="block text-sm font-semibold">{t("Describe the work","Décrivez le travail")}<textarea required maxLength={4000} className={marketInput} rows={4} value={body} onChange={e=>setBody(e.target.value)} aria-describedby="description-help"/></label>
      <p id="description-help" className="-mt-3 text-xs text-slate-600">{t("Professionals can read this description. Share your street address and contact information privately in a conversation.","Les professionnels peuvent lire cette description. Communiquez votre adresse précise et vos coordonnées en privé dans une conversation.")}</p>
      <label className="block text-sm font-semibold">{t("When do you need the service?","Quand souhaitez-vous le service ?")}<select className={marketInput} value={urgency} onChange={e=>setUrgency(e.target.value)}><option value="flexible">{t("My dates are flexible","Mes dates sont flexibles")}</option><option value="week">{t("Within a week","Dans la semaine")}</option><option value="asap">{t("As soon as possible","Dès que possible")}</option></select></label>
      <div className="rounded-xl border border-slate-200 p-4"><button type="button" className="flex min-h-11 items-center gap-2 text-sm font-bold text-teal-800" aria-expanded={showDirectory} onClick={()=>setShowDirectory(!showDirectory)}><Users size={17}/>{t("Invite preferred professionals (optional)","Inviter des professionnels de votre choix (facultatif)")} · {selected.length}</button>
        {selected.length>0 && <p className="mt-1 text-sm text-slate-600">{selected.map(p=>p.name).join(", ")}</p>}
        {showDirectory && <div className="mt-4"><CustomerDirectory providers={providers} selected={selected.map(p=>p.id)} onChange={select}/></div>}
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <button className={marketPrimary} disabled={busy}>{busy?t("Publishing…","Publication…"):t("Publish my free request","Publier ma demande gratuite")}<ArrowRight size={16}/></button>
    </form>
  </section>;
}
