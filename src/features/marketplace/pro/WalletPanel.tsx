import {useRef,useState} from "react";
import {Coins,ExternalLink,WalletCards} from "lucide-react";
import {Button} from "@/components/ui/button";
import {supabase} from "@/lib/supabase";
import {credits,type Language,type Translate,type Wallet} from "./model";

export function WalletPanel({wallet,language,t,leadId=null,packsOnly=false}:{wallet:Wallet;language:Language;t:Translate;leadId?:string|null;packsOnly?:boolean}) {
  const [busy,setBusy]=useState("");
  const [error,setError]=useState(false);
  const attempts=useRef(new Map<string,string>());
  const guard=useRef(false);
  const formatPrice=(cents:number)=>new Intl.NumberFormat(language==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",currencyDisplay:"code",minimumFractionDigits:0,maximumFractionDigits:2}).format(cents/100);
  const offers=wallet.packs.filter(o=>!packsOnly||o.kind==="pack");
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
    <div className="grid gap-2 sm:grid-cols-3">{offers.map(offer=><button type="button" key={offer.code} disabled={!offer.enabled || offer.credits===null || offer.price_cents===null || !!busy || (offer.kind==="subscription" && !!wallet.subscription && ["active","trialing","past_due"].includes(wallet.subscription.status))} onClick={()=>void checkout(offer.code)} className="rounded-xl border border-slate-300 bg-white p-3 text-left leading-tight text-slate-900 hover:border-teal-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500">
      <span className="block text-xs font-medium">{offer.kind==="subscription"?t("Monthly subscription","Abonnement mensuel"):t("Credit pack","Pack de crédits")}</span><strong className="my-2 block text-lg">{offer.price_cents!==null?formatPrice(offer.price_cents):t("Pricing pending","Tarif à venir")}</strong><span className="flex items-center gap-1.5 text-xs">{offer.enabled && offer.credits!==null?<><Coins size={12}/>{credits(offer.credits,t)}</>:t("Unavailable","Indisponible")}</span>{busy===offer.code && <span className="sr-only" role="status">{t("Opening checkout","Ouverture du paiement")}</span>}
    </button>)}</div>
    {!packsOnly && wallet.subscription && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4"><p className="text-sm font-semibold">{t("Your subscription","Votre abonnement")}</p><Button variant="outline" disabled={!!busy} onClick={()=>void checkout("portal",true)}>{t("Manage subscription","Gérer l’abonnement")}<ExternalLink/></Button></div>}
    {error && <p role="alert" className="text-sm font-medium text-red-800">{t("Checkout could not be opened. Please try again later.","Le paiement n’a pas pu être ouvert. Veuillez réessayer plus tard.")}</p>}
  </div>;
}
