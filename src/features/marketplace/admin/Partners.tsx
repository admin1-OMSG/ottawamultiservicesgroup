import { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";
import { buttonClass, fieldClass, quietButtonClass, invitation, type Language, type Partner, type Translate, type Update } from "./model";

function PartnerRate({ partner, text, busy, update }: { partner: Partner; text: Translate; busy: boolean; update: Update }) {
  const [percent, setPercent] = useState(String(partner.discount_percent ?? 0));
  const [checked, setChecked] = useState(false);
  return <form onSubmit={event=>{
    event.preventDefault();
    void update("market_set_discount", { p_account_id: partner.account_id, p_percent: Number(percent) });
  }} className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
    <div><p className="font-semibold">{partner.business_name}</p><p className="text-sm text-slate-600">{partner.email}</p></div>
    <label className="grid max-w-xs gap-1 text-sm">{text("Partner discount (%)","Réduction partenaire (%)")}<input className={fieldClass} value={percent} onChange={e=>setPercent(e.target.value)} type="number" min="0" max="99" step="1" required /></label>
    {Number(percent) > 0 && <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} />{text("I verified that this approved professional is an existing OMSG partner.","J’ai vérifié que ce professionnel approuvé est un partenaire existant d’OMSG.")}</label>}
    <button className={buttonClass} disabled={busy || percent === "" || Number(percent) === (partner.discount_percent ?? 0) || (Number(percent)>0 && !checked)}>{text("Save partner rate","Enregistrer le tarif partenaire")}</button>
  </form>;
}

export function Partners({ partners, text, language, busy, update }: { partners: Partner[]; text: Translate; language: Language; busy: boolean; update: Update }) {
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState("");
  const [name,setName] = useState("");
  const [letterLanguage,setLetterLanguage] = useState<Language>(language);
  const [copyFeedback,setCopyFeedback] = useState("");
  const filtered = partners.filter(p=>(p.business_name+" "+p.email).toLowerCase().includes(query.trim().toLowerCase()));
  const active = filtered.find(p=>p.account_id===selected);
  const draft = invitation(letterLanguage, name.trim(), absoluteUrl("/pro"));
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft.subject+"\n\n"+draft.body);
      setCopyFeedback(text("Draft copied.","Brouillon copié."));
    } catch {
      setCopyFeedback(text("Select and copy the draft below.","Sélectionnez et copiez le brouillon ci-dessous."));
    }
  }
  return <div className="grid items-start gap-4 xl:grid-cols-2">
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">{text("Existing partner rates","Tarifs des partenaires existants")}</h2>
      <p className="text-sm text-slate-600">{text("Match the approved professional’s account to your partner records before assigning a discount.","Faites correspondre le compte professionnel approuvé à votre registre de partenaires avant d’attribuer une réduction.")} <a className="font-semibold text-teal-800 underline" href="/admin/partners">{text("Open partner records","Consulter le registre")}</a></p>
      <label className="grid gap-1 text-sm">{text("Find an approved professional","Rechercher un professionnel approuvé")}<input type="search" className={fieldClass} placeholder={text("Name or email","Nom ou courriel")} value={query} onChange={e=>setQuery(e.target.value)} /></label>
      {filtered.length ? <label className="grid gap-1 text-sm">{text("Professional","Professionnel")}<select value={active?.account_id ?? ""} onChange={e=>setSelected(e.target.value)} className={fieldClass}>
        <option value="">{text("Choose an account","Choisir un compte")}</option>{filtered.map(p=><option key={p.account_id} value={p.account_id}>{p.business_name} · {p.email}</option>)}
      </select></label> : <p className="text-sm text-slate-600">{text("No matching approved professionals.","Aucun professionnel approuvé correspondant.")}</p>}
      {active && <PartnerRate key={active.account_id+"/"+active.discount_percent} partner={active} {...{text,busy,update}}/>}
    </section>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Mail className="size-5 text-teal-800"/>{text("Partner invitation draft","Brouillon d’invitation partenaire")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">{text("Contact name (optional)","Nom du contact (facultatif)")}<input className={fieldClass} value={name} maxLength={160} onChange={e=>{setName(e.target.value);setCopyFeedback("");}} /></label>
        <label className="grid gap-1 text-sm">{text("Email language","Langue du courriel")}<select value={letterLanguage} className={fieldClass} onChange={e=>{setLetterLanguage(e.target.value as Language);setCopyFeedback("");}}><option value="fr">Français</option><option value="en">English</option></select></label>
      </div>
      <p className="font-semibold text-slate-800">{draft.subject}</p>
      <textarea aria-label={text("Invitation text","Texte de l’invitation")} readOnly className={fieldClass} rows={10} value={draft.body}/>
      <button type="button" className={quietButtonClass+" inline-flex items-center gap-2"} onClick={()=>void copy()}><Copy className="size-4"/>{text("Copy invitation","Copier l’invitation")}</button>
      {copyFeedback && <p role="status" className="text-sm text-teal-800">{copyFeedback}</p>}
    </section>
  </div>;
}
