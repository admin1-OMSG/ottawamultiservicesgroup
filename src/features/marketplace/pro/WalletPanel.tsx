import {useRef,useState} from "react";
import {ArrowRight,Coins,ExternalLink,WalletCards} from "lucide-react";
import {Button} from "@/components/ui/button";
import {supabase} from "@/lib/supabase";
import {loyaltyTerms} from "../credit-offer";
import {credits,type Language,type Translate,type Wallet} from "./model";

export function WalletPanel({wallet,language,t,leadId=null,packsOnly=false,selectedCode=null}:{wallet:Wallet;language:Language;t:Translate;leadId?:string|null;packsOnly?:boolean;selectedCode?:string|null}) {
  const [busy,setBusy]=useState("");
  const [error,setError]=useState(false);
  const attempts=useRef(new Map<string,string>());
  const guard=useRef(false);
  const formatPrice=(cents:number)=>new Intl.NumberFormat(language==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",currencyDisplay:"narrowSymbol",minimumFractionDigits:0,maximumFractionDigits:2}).format(cents/100);
  const offers=wallet.packs.filter(o=>!packsOnly||o.kind==="pack");
  const selected = offers.find(offer => offer.code === selectedCode && offer.enabled && offer.credits !== null && offer.price_cents !== null);
  const orderedOffers = selected ? [selected, ...offers.filter(offer => offer.code !== selected.code)] : offers;
  async function checkout(code:string,manage=false) {
    if(guard.current)return;
    guard.current=true;setBusy(code);setError(false);
    const key=JSON.stringify([code,leadId]);
    const attempt=attempts.current.get(key)||crypto.randomUUID();
    attempts.current.set(key,attempt);
    try {
      const result=await supabase.functions.invoke("market-checkout",{body:manage?{action:"manage"}:{offer_code:code,attempt_id:attempt,return_request_id:leadId}});
      if(result.error) {
        const details=result.error.context instanceof Response ? await result.error.context.json().catch(()=>null) : null;
        if(details?.error==="checkout_expired") attempts.current.delete(key);
        throw result.error;
      }
      if(!result.data?.url) throw new Error("checkout");
      const url=new URL(result.data.url,window.location.origin);
      if(url.origin===window.location.origin && url.pathname==="/pro-market" && (url.searchParams.get("checkout")==="success" || (wallet.preview_checkout_enabled && url.searchParams.get("checkout")==="simulated"))) {
        window.location.assign(url.href);return;
      }
      if(url.protocol!=="https:"||!["checkout.stripe.com","billing.stripe.com"].includes(url.hostname)) throw new Error("checkout");
      window.location.assign(url.href);
    } catch {
      setError(true);setBusy("");guard.current=false;
    }
  }
  return <div className="space-y-4">
    {!packsOnly && <div className="rounded-2xl bg-teal-900 p-5 text-white"><div className="flex items-center gap-2 text-sm text-teal-100"><WalletCards size={16}/>{t("Available balance","Solde disponible")}</div><div className="mt-2 text-3xl font-bold">{credits(wallet.balance,t)}</div>{wallet.discount_percent>0 && <p className="mt-2 text-sm">{t("Partner discount","Réduction partenaire")} · {wallet.discount_percent}%</p>}</div>}
    {wallet.preview_checkout_enabled && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{t("Test purchases only. No money will be charged.","Les achats sont simulés. Aucun montant ne sera facturé.")}</p>}
    {selectedCode && !selected && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("The selected offer is unavailable. Choose another offer below.","L’offre sélectionnée est indisponible. Choisissez une autre offre ci-dessous.")}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      {orderedOffers.map(offer => {
        const monthly = offer.kind === "subscription";
        const available = offer.enabled && offer.credits !== null && offer.price_cents !== null;
        const terms = available ? loyaltyTerms(offer, t) : null;
        const hasSubscription = wallet.subscription && !["canceled", "incomplete_expired"].includes(wallet.subscription.status);
        return <button type="button" key={offer.code}
          disabled={!available || !!busy || (monthly && !!hasSubscription)}
          onClick={() => void checkout(offer.code)}
          className={"flex flex-col items-stretch rounded-xl border bg-white p-4 text-left leading-tight text-slate-900 hover:border-teal-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 "+(offer===selected?"border-teal-700 ring-2 ring-teal-700":"border-slate-300")}>
          {offer===selected && <span className="mb-2 text-xs font-bold text-teal-800">{t("Your selection","Votre sélection")}</span>}
          <span className="block text-xs font-medium">{monthly ? t("Monthly subscription", "Abonnement mensuel") : t("Credit pack", "Pack de crédits")}</span>
          <strong className="my-2 block text-lg">
            {offer.price_cents !== null ? formatPrice(offer.price_cents) : t("Pricing pending", "Tarif à venir")}
            {monthly && offer.price_cents !== null && <span className="text-sm font-normal">{t(" / month", " / mois")}</span>}
          </strong>
          {available && offer.credits !== null ? <>
            <span className="flex items-start gap-1.5 text-sm"><Coins aria-hidden="true" size={14} className="mt-0.5 shrink-0"/>{terms?.base ?? credits(offer.credits, t)}</span>
            {terms && <span className="mt-2 block text-sm leading-snug">{terms.bonus}</span>}
          </> : <span className="text-sm">{t("Unavailable", "Indisponible")}</span>}
          {available && <span className="mt-auto pt-4"><span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white">
            {busy === offer.code ? t("Opening checkout…","Ouverture du paiement…") : monthly && hasSubscription ? t("Subscription already in place","Abonnement déjà en cours") : t("Continue to payment","Passer au paiement")}
            {!(monthly && hasSubscription) && <ArrowRight size={15} aria-hidden="true"/>}
          </span></span>}
        </button>;
      })}
    </div>
    {!packsOnly && wallet.subscription && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4"><p className="text-sm font-semibold">{t("Your subscription","Votre abonnement")}</p><Button variant="outline" disabled={!!busy} onClick={()=>void checkout("portal",true)}>{t("Manage subscription","Gérer l’abonnement")}<ExternalLink/></Button></div>}
    {error && <p role="alert" className="text-sm font-medium text-red-800">{t("Checkout could not be opened. Please try again later.","Le paiement n’a pas pu être ouvert. Veuillez réessayer plus tard.")}</p>}
  </div>;
}
