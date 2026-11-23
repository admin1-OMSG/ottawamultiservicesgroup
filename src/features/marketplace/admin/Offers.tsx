import { useState } from "react";
import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";
import { buttonClass, fieldClass, money, type Language, type Offer, type Tariff, type Translate, type Update } from "./model";

type Controls = { text: Translate; busy: boolean; update: Update };
function OfferForm({ offer, language, text, busy, update }: Controls & { offer: Offer; language: Language }) {
  const monthly = offer.kind === "subscription";
  const [credits, setCredits] = useState(offer.credits?.toString() ?? "");
  const [price, setPrice] = useState(offer.price_cents == null ? "" : (offer.price_cents / 100).toFixed(2));
  const [enabled, setEnabled] = useState(offer.enabled);
  const cents = price ? Math.round(Number(price) * 100) : null;
  const changed = enabled !== offer.enabled || (credits ? Number(credits) : null) !== offer.credits || cents !== offer.price_cents;
  return <form onSubmit={(event) => {
    event.preventDefault();
    void update("market_save_offer", { p_code: offer.code, p_enabled: enabled, p_price_cents: monthly ? cents : offer.price_cents, p_credits: credits ? Number(credits) : null });
  }} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="font-semibold text-slate-900">{monthly ? text("Monthly subscription","Abonnement mensuel") : text("Credit pack","Pack de crédits") + " · " + money(offer.price_cents ?? 0, language)}</h3>
    {monthly && <label className="grid gap-1 text-sm">{text("Monthly price (CAD)","Prix mensuel ($ CA)")}<input className={fieldClass} type="number" min="0.50" max="99999.99" step="0.01" required={enabled} value={price} onChange={e=>setPrice(e.target.value)} /></label>}
    <label className="grid gap-1 text-sm">{monthly ? text("Credits per paid month","Crédits par mois payé") : text("Credits in pack","Crédits du pack")}<input className={fieldClass} type="number" required={enabled} min="1" max="100000" step="1" value={credits} onChange={e=>setCredits(e.target.value)} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />{text("Available to purchase","Disponible à l’achat")}</label>
    <button className={buttonClass + " mt-auto self-start"} disabled={busy || !changed}>{text("Save offer","Enregistrer l’offre")}</button>
  </form>;
}

function TariffForm({ tariff, title, text, busy, update }: Controls & { tariff: Tariff; title: string }) {
  const [credits, setCredits] = useState(tariff.credits?.toString() ?? "");
  return <form onSubmit={e=>{
    e.preventDefault();
    void update("market_set_tariff", { p_service: tariff.service, p_credits: Number(credits) });
  }} className="grid items-center gap-3 border-t border-slate-100 py-3 sm:grid-cols-[1fr_9rem_auto]">
    <label htmlFor={"tariff-" + tariff.service} className="text-sm font-medium text-slate-800">{title}</label>
    <input id={"tariff-" + tariff.service} type="number" min="1" max="100000" step="1" required className={fieldClass} value={credits} onChange={e=>setCredits(e.target.value)} placeholder={text("Credits","Crédits")} />
    <button className={buttonClass} disabled={busy || !credits || Number(credits) === tariff.credits}>{text("Save","Enregistrer")}</button>
  </form>;
}

export function Offers({ offers, tariffs, text, language, busy, update }: Controls & { offers: Offer[]; tariffs: Tariff[]; language: Language }) {
  const serviceNames = new Map<string,string>(PROFESSIONAL_SERVICE_OPTIONS.map(option => [option.value, option[language]]));
  const configured = new Map(tariffs.map(tariff=>[tariff.service,tariff]));
  for (const service of serviceNames.keys()) if (!configured.has(service)) configured.set(service, { service, credits: null });
  return <div className="grid gap-6">
    <section aria-label={text("Offers","Offres")}>
      <h2 className="mb-3 text-lg font-bold">{text("Credit packs and subscriptions","Packs de crédits et abonnements")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{offers.map(offer=><OfferForm key={[offer.code,offer.price_cents,offer.credits,offer.enabled].join("/")} {...{offer,language,text,busy,update}} />)}</div>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">{text("Cost to contact a customer","Coût du contact client")}</h2>
      <p className="my-2 text-sm text-slate-600">{text("Set the credit cost for each service category.","Fixez le nombre de crédits par catégorie de service.")}</p>
      {[...configured.values()].map(tariff=><TariffForm key={tariff.service + "/" + tariff.credits} title={serviceNames.get(tariff.service) ?? tariff.service} {...{tariff,text,busy,update}} />)}
    </section>
  </div>;
}
