import { useEffect, useRef, useState, type FormEvent } from "react";
import type { VerifyOtpParams } from "@supabase/supabase-js";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { professionalSignInErrorMessage } from "@/features/professionals/sign-in-errors";
import { canadianPhone, marketInput, marketPrimary, marketSecondary } from "./customer-model";
import servicePhoto from "@/assets/omsg-moving-service.png";

export const MARKET_RETURN_KEY = "omsg.marketplace.returnTo";
function emailVerification(email: string, input: string): VerifyOtpParams {
  if (/^\d{4,10}$/.test(input)) return { type: "email", email, token: input };
  const link = new URL(input);
  const type = link.searchParams.get("type");
  const hash = link.searchParams.get("token");
  if (link.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin ||
      link.pathname !== "/auth/v1/verify" || !hash ||
      (type !== "magiclink" && type !== "signup" && type !== "email")) {
    throw new Error("Invalid verification link");
  }
  return { type, token_hash: hash };
}
export function CustomerSignIn() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => language === "fr" ? fr : en;
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [value, setValue] = useState("");
  const [sent, setSent] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [smsAvailable,setSmsAvailable]=useState<boolean|null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const authUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!authUrl || !apiKey) { setSmsAvailable(false); return; }
    async function loadMethods(){
      try {
        const response = await fetch(new URL("/auth/v1/settings", authUrl), {
          headers: {apikey:apiKey}, signal: controller.signal,
        });
        if (!response.ok) throw new Error("Auth settings unavailable");
        const settings = await response.json();
        if (!controller.signal.aborted) setSmsAvailable(settings?.external?.phone === true);
      } catch { if (!controller.signal.aborted) setSmsAvailable(false); }
    }
    void loadMethods();
    return () => controller.abort();
  }, []);
  function reset() { setSent(""); setCode(""); setError(""); }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    const destination = sent || (method === "sms" ? canadianPhone(value) : value.trim().toLowerCase());
    if (!destination) { setError(t("Enter a valid phone number with its country code.","Entrez un numéro valide avec l’indicatif du pays.")); return; }
    lock.current = true;
    setBusy(true);
    try {
      if (sent) {
        const token = code.trim();
        const {error} = await supabase.auth.verifyOtp(method === "sms" ? {type:"sms",phone:sent,token} : emailVerification(sent, token));
        if (error) throw error;
      } else {
        if (method === "email") {
          try { localStorage.setItem(MARKET_RETURN_KEY, window.location.pathname + window.location.search); } catch { /* A same-tab OTP still works. */ }
        }
        const {error} = await supabase.auth.signInWithOtp(method === "sms" ? { phone: destination, options: { shouldCreateUser:true, data:{language} } } : {
          email: destination, options: { shouldCreateUser:true, data:{language}, emailRedirectTo: window.location.origin + "/pro" }
        });
        if (error) throw error;
        setSent(destination);
      }
    } catch (failure) {
      if (sent) setError(t("Verification failed. Request a new message and use the latest link or code.","La vérification a échoué. Demandez un nouveau message et utilisez le dernier lien ou code reçu."));
      else if (method === "sms") setError(t("The text could not be sent. Check the number or choose email to continue.","Le SMS n’a pas pu être envoyé. Vérifiez le numéro ou continuez par courriel."));
      else setError(professionalSignInErrorMessage(failure,language));
    } finally { setBusy(false); lock.current=false; }
  }
  return <main className="mx-auto grid max-w-6xl gap-8 px-5 py-9 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-16 lg:py-14">
    <div className="max-w-xl"><h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{t("Find a local professional","Trouvez un professionnel près de chez vous")}</h1>
      <p className="mt-4 text-base leading-7 text-slate-600">{t("Post a free request, choose local professionals and keep their replies in one place.","Publiez une demande gratuite, choisissez des professionnels de votre région et retrouvez leurs réponses au même endroit.")}</p>
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold">{sent?t("Check your messages","Consultez vos messages"):t("Access your requests","Accéder à mes demandes")}</h2>
        {!sent && <div className="mt-5 flex gap-2" role="group" aria-label={t("Verification method","Mode de vérification")}>{(["email","sms"] as const).map((m) => <button key={m} type="button" className={method===m?marketPrimary:marketSecondary} aria-pressed={method===m} disabled={busy || (m==="sms" && smsAvailable!==true)} onClick={()=>{setMethod(m);setValue("");reset();}}>{m==="email"?<Mail size={16}/>:<Phone size={16}/>}{m==="email"?t("Email","Courriel"):"SMS"}</button>)}</div>}
        {!sent && smsAvailable===false && <p className="mt-3 text-xs text-slate-600">{t("SMS verification is currently unavailable. Use email to continue.","La vérification par SMS est actuellement indisponible. Continuez par courriel.")}</p>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {sent ? <><p role="status" className="text-sm leading-6 text-slate-600">{method==="sms"?t("Enter the code sent by text to ","Saisissez le code envoyé par SMS au "):t("Copy the sign-in link from the email sent to ","Copiez le lien de connexion dans le courriel envoyé à ")}<strong>{sent}</strong>. {method==="email" && t("Paste the link below without opening it, or enter the code from the email.","Collez le lien ci-dessous sans l’ouvrir, ou saisissez le code du courriel.")}</p><label className="block text-sm font-semibold">{method==="sms"?t("Verification code","Code de vérification"):t("Email link or code","Lien du courriel ou code")}<input className={marketInput} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} inputMode={method==="email"?"text":"numeric"} pattern={method==="sms"?"[0-9]{4,10}":undefined} maxLength={method==="sms"?10:8192} required value={code} onChange={e=>setCode(e.target.value)}/></label></> :
            <label className="block text-sm font-semibold">{method==="email"?t("Email address","Adresse courriel"):t("Mobile phone","Téléphone mobile")}<input className={marketInput} type={method==="email"?"email":"tel"} autoComplete={method==="email"?"email":"tel"} placeholder={method==="email"?t("you@example.ca","vous@exemple.ca"):"+1 613 555 0100"} required value={value} onChange={e=>setValue(e.target.value)}/></label>}
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          <button className={marketPrimary+" w-full"} disabled={busy}>{busy?t("Please wait…","Un instant…"):sent?t("Verify and continue","Vérifier et continuer"):method==="email"?t("Send my sign-in link","Envoyer mon lien de connexion"):t("Send my code","Envoyer mon code")}<ArrowRight size={16}/></button>
          {sent && <button type="button" disabled={busy} className="text-sm font-semibold text-teal-800 underline" onClick={reset}>{t("Change contact or request another message","Changer de coordonnées ou demander un nouvel envoi")}</button>}
        </form>
      </section></div>
    <div className="hidden overflow-hidden rounded-3xl lg:block"><img className="h-[32rem] w-full object-cover" src={servicePhoto} alt={t("Moving professionals serving the Ottawa area","Professionnels du déménagement dans la région d’Ottawa")}/></div>
  </main>;
}
