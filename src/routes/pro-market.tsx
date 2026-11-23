import {useEffect,useState} from "react";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {ArrowRight,LoaderCircle,ShieldCheck,UserRound} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {LanguageSwitcher,useLanguage} from "@/lib/language";
import {Button} from "@/components/ui/button";
import {ProfessionalDashboard} from "@/features/marketplace/pro/ProfessionalDashboard";
import {rememberProfessionalDestination,type Translate} from "@/features/marketplace/pro/model";

export const Route=createFileRoute("/pro-market")({
  head:()=>({meta:[{title:"Professional marketplace | Ottawa Multiservices Group"},{name:"robots",content:"noindex, nofollow"}]}),
  component:ProfessionalMarketplace,
});
function ProfessionalMarketplace() {
  const {language}=useLanguage();
  const t:Translate=(en,fr)=>language==="fr"?fr:en;
  const [userId,setUserId]=useState<string|null|undefined>(undefined);
  useEffect(()=>{
    let received=false;
    let mounted=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      received=true;
      if(mounted) setUserId(session?.user.id??null);
    });
    void supabase.auth.getSession().then(({data})=>{
      if(mounted && !received) setUserId(data.session?.user.id??null);
    }).catch(()=>{if(mounted && !received) setUserId(null);});
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  const profile=useQuery({
    queryKey:["market-pro-access",userId],enabled:!!userId,retry:1,refetchInterval:60000,gcTime:0,
    queryFn:async()=>{
      const {data,error}=await supabase.from("professional_accounts").select("id,business_name,contact_name,review_status").eq("user_id",userId!).maybeSingle();
      if(error) throw error;
      return data;
    },
  });
  const chosenOffer = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("offer") : null;
  const loading=userId===undefined || (!!userId && profile.isPending);
  return <div data-i18n-ignore="true" className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
      <a href="/" className="flex items-center gap-2" aria-label={t("OMSG home","Accueil OMSG")}><span className="grid size-10 place-items-center rounded-xl bg-orange-500 font-bold text-slate-950">O</span><span className="text-sm font-extrabold leading-tight">Ottawa MSG<span className="block text-[9px] font-medium uppercase tracking-[.16em] text-slate-600">Multi Services Group</span></span></a>
      <div className="flex flex-wrap items-center justify-end gap-2"><a href="/pro-pricing" className="rounded-lg px-2 py-2 text-sm font-bold text-teal-800 hover:underline">{t("Pro pricing", "Tarifs pros")}</a><LanguageSwitcher compact/><Button variant="ghost" size="icon" asChild><a href="/pro" aria-label={t("Professional profile","Profil professionnel")}><UserRound/></a></Button></div>
    </div></header>
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      {loading ? <div role="status" className="flex gap-2 py-6 text-sm"><LoaderCircle className="size-4 animate-spin"/>{t("Opening your dashboard…","Ouverture de votre tableau de bord…")}</div> : profile.isError && userId ? <div role="alert" className="rounded-2xl bg-white p-5"><p>{t("Your account could not be loaded.","Votre compte n’a pas pu être chargé.")}</p><Button className="mt-3" onClick={()=>void profile.refetch()}>{t("Try again","Réessayer")}</Button></div> : userId && profile.data?.review_status==="approved" ? <ProfessionalDashboard key={userId} userId={userId} profileId={profile.data.id} name={profile.data.business_name||profile.data.contact_name||""} language={language} t={t}/> : (
        <ProfessionalAccessGate offer={chosenOffer} signedIn={!!userId} t={t}/>
      )}
    </main>
  </div>;
}

function ProfessionalAccessGate({offer,signedIn,t}:{offer:string|null;signedIn:boolean;t:Translate}) {
  let message: string;
  if (offer) {
    message=signedIn
      ? t("You can purchase this offer once OMSG approves your professional profile. Open your profile to check its status.","Vous pourrez acheter cette offre dès qu’OMSG aura approuvé votre profil professionnel. Consultez votre profil pour vérifier son statut.")
      : t("Sign in to your approved professional account to review the selected offer and continue to payment.","Connectez-vous à votre compte professionnel approuvé pour consulter l’offre choisie et passer au paiement.");
  } else {
    message=signedIn
      ? t("Your marketplace opens once OMSG approves your professional profile.","Votre tableau de bord s’ouvrira après l’approbation de votre profil professionnel par OMSG.")
      : t("Sign in with your professional account to see service requests and your conversations.","Connectez-vous à votre compte professionnel pour consulter les demandes et vos conversations.");
  }
  return <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
    <ShieldCheck className="mb-4 size-9 text-teal-700"/>
    <h1 className="text-2xl font-bold">{offer?t("Continue to payment","Passer au paiement"):t("Professional dashboard","Tableau de bord professionnel")}</h1>
    <p className="my-4 text-slate-600">{message}</p>
    <Button asChild>
      <a href={offer?"/pro?"+new URLSearchParams({offer}).toString():"/pro"} onClick={rememberProfessionalDestination}>
        {signedIn?t("View my profile","Voir mon profil"):t("Professional sign-in","Connexion professionnelle")}<ArrowRight/>
      </a>
    </Button>
  </div>;
}
