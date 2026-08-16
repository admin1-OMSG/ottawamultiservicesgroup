import { useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type VerificationPurpose = "quote" | "partner_service_provider" | "partner_subcontracting";

export function EmailVerification({
  email,
  purpose,
  language,
  token,
  onVerified,
}: {
  email: string;
  purpose: VerificationPurpose;
  language: "en" | "fr";
  token: string | null;
  onVerified: (token: string | null) => void;
}) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      toast.error(language === "fr" ? "Entrez d’abord une adresse courriel valide." : "Enter a valid email address first.");
      return;
    }
    setBusy(true);
    onVerified(null);
    try {
      const { data, error } = await supabase.functions.invoke("request-email-verification", {
        body: { email: normalized, purpose, language },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Unable to send code");
      setSent(true);
      toast.success(language === "fr" ? "Code de vérification envoyé." : "Verification code sent.");
    } catch (e) {
      console.error("Email verification request failed:", e);
      toast.error(language === "fr" ? "Impossible d’envoyer le code. Réessayez." : "Unable to send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error(language === "fr" ? "Entrez le code à 6 chiffres." : "Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-code", {
        body: { email: email.trim().toLowerCase(), purpose, code },
      });
      if (error || !data?.ok || !data?.token) throw new Error(data?.error || error?.message || "Invalid code");
      onVerified(data.token);
      toast.success(language === "fr" ? "Adresse courriel vérifiée." : "Email verified.");
    } catch (e) {
      console.error("Email verification failed:", e);
      toast.error(language === "fr" ? "Code invalide ou expiré." : "Invalid or expired verification code.");
    } finally {
      setBusy(false);
    }
  };

  if (token) {
    return <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />{language === "fr" ? "Courriel vérifié" : "Email verified"}</div>;
  }

  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-navy"><Mail className="h-4 w-4 text-accent" />{language === "fr" ? "Vérification du courriel requise" : "Email verification required"}</div>
      <p className="mt-1 text-xs text-muted-foreground">{language === "fr" ? "Nous devons vérifier votre adresse avant d’accepter la demande." : "We need to verify your address before accepting the submission."}</p>
      {!sent ? (
        <Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={requestCode}>{busy ? (language === "fr" ? "Envoi…" : "Sending…") : (language === "fr" ? "Envoyer le code" : "Send verification code")}</Button>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="123456" maxLength={6} className="sm:max-w-40" />
          <Button type="button" onClick={verifyCode} disabled={busy}>{busy ? (language === "fr" ? "Vérification…" : "Verifying…") : (language === "fr" ? "Vérifier" : "Verify")}</Button>
          <Button type="button" variant="ghost" onClick={requestCode} disabled={busy}>{language === "fr" ? "Renvoyer" : "Resend"}</Button>
        </div>
      )}
    </div>
  );
}
