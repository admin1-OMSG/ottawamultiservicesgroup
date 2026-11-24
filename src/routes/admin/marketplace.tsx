import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Banknote, Handshake, RefreshCw, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireActiveAdmin } from "@/features/admin/requireAdmin";
import { Offers } from "@/features/marketplace/admin/Offers";
import { Partners } from "@/features/marketplace/admin/Partners";
import { Refunds } from "@/features/marketplace/admin/Refunds";
import { quietButtonClass, type AdminData, type Update } from "@/features/marketplace/admin/model";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/marketplace")({ component: MarketplaceAdmin });

function MarketplaceAdmin() {
  const [userId,setUserId] = useState<string | null>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  useEffect(() => {
    const {data} = supabase.auth.onAuthStateChange((_event,session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (userId === null) void navigate({to:"/admin/login"});
  }, [navigate,userId]);
  return userId ? <AdminWorkspace key={userId} userId={userId}/> : <p role="status">{language === "fr" ? "Chargement…" : "Loading…"}</p>;
}

function AdminWorkspace({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const text = useCallback((en: string,fr: string)=>language==="fr" ? fr : en,[language]);
  const [tab,setTab] = useState<"refunds"|"pricing"|"partners">("refunds");
  const [data,setData] = useState<AdminData | null>(null);
  const [busy,setBusy] = useState(false);
  const [feedback,setFeedback] = useState<"loaded-error"|"save-error"|"saved"|"saved-refresh-error"|null>(null);
  const mounted = useRef(false);
  const lock = useRef(false);

  const operation = useCallback(async (method?:string,args?:Parameters<Update>[1])=>{
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback(null);
    let written = false;
    try {
      const admin = await requireActiveAdmin();
      if (!mounted.current) return;
      if (admin?.id !== userId) {
        setData(null);
        await navigate({to:"/admin/login"});
        return;
      }
      if (method) {
        const change = await supabase.rpc(method,args);
        if (change.error) throw change.error;
        written = true;
      }
      const result = await supabase.rpc("market_billing_admin");
      if (result.error || !result.data) throw new Error("marketplace_unavailable");
      if (mounted.current) {
        setData(result.data as AdminData);
        if (written) setFeedback("saved");
      }
    } catch {
      if (mounted.current) {
        if (written || !method) setData(null);
        setFeedback(written ? "saved-refresh-error" : method ? "save-error" : "loaded-error");
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [navigate,userId]);

  useEffect(()=>{
    mounted.current = true;
    void operation();
    return () => {mounted.current=false;};
  },[operation]);
  const tabs = [
    {id:"refunds",label:text("Refunds","Remboursements"),icon:Undo2},
    {id:"pricing",label:text("Pricing","Tarifs"),icon:Banknote},
    {id:"partners",label:text("Partners","Partenaires"),icon:Handshake},
  ] as const;
  return <div className="space-y-5" data-i18n-ignore="true">
    <PageHeader title={text("Service marketplace","Plateforme de services")} action={<button type="button" className={quietButtonClass+" inline-flex items-center gap-2"} onClick={()=>void operation()} disabled={busy}><RefreshCw className="size-4"/>{text("Refresh","Actualiser")}</button>}/>
    {feedback === "saved" && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{text("Changes saved.","Modifications enregistrées.")}</p>}
    {feedback && feedback !== "saved" && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{feedback==="loaded-error" ? text("Marketplace settings could not be loaded. Try refreshing.","Impossible de charger les réglages de la plateforme. Veuillez actualiser.") : feedback==="saved-refresh-error" ? text("Changes were saved. Refresh to load the latest information.","Les modifications sont enregistrées. Actualisez pour charger les informations à jour.") : text("The change could not be saved. Check the values and refresh before trying again.","Impossible d’enregistrer la modification. Vérifiez les valeurs et actualisez avant de réessayer.")}</p>}
    {busy && !data && <p role="status" className="text-sm text-slate-600">{text("Loading…","Chargement…")}</p>}
    {data && <>
      <nav aria-label={text("Marketplace sections","Rubriques de la plateforme")} className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
        {tabs.map(({id,label,icon:Icon})=><button type="button" key={id} aria-pressed={id === tab} onClick={()=>setTab(id)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${id === tab ? "bg-teal-800 text-white" : "text-slate-600 hover:bg-teal-50"}`}><Icon className="size-4"/>{label}</button>)}
      </nav>
      {tab==="refunds" && <Refunds refunds={data.refunds} {...{text,language,busy}} update={operation}/>}
      {tab==="pricing" && <Offers offers={data.offers} tariffs={data.tariffs} {...{text,language,busy}} update={operation}/>}
      {tab==="partners" && <Partners partners={data.partners} {...{text,language,busy}} update={operation}/>}
    </>}
  </div>;
}
