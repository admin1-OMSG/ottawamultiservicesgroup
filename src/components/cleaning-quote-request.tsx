import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmailVerification } from "@/components/email-verification";
import { FileCameraInput } from "@/components/file-camera-input";
import { supabase } from "@/lib/supabase";
import { sendCrmEmail } from "@/lib/email-notifications";
import {
  PRICING_VERSION,
  type Locale,
  type PricingSelection,
  type CleaningEstimate,
  pricingAnswers,
} from "@/lib/cleaning-pricing";

export function CleaningQuoteRequest({
  selection,
  estimate,
  locale,
  onProvinceChange,
  onSaved,
}: {
  selection: PricingSelection;
  estimate: CleaningEstimate;
  locale: Locale;
  onProvinceChange: (value: "Ontario" | "Quebec") => void;
  onSaved: (id: string, missingPhotos: boolean) => void;
}) {
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const submitted = useRef(false);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || processing || submitted.current) return;
    setError("");
    if (!token) {
      setError(
        t(
          "Please verify your email to send your request.",
          "Veuillez vérifier votre courriel pour envoyer la demande.",
        ),
      );
      return;
    }
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const name = value("name"),
      phone = value("phone"),
      postal = value("postal_code").toUpperCase().replace(/\s/g, "");
    if (
      !name ||
      !value("address") ||
      !value("city") ||
      phone.replace(/\D/g, "").length < 10 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\d[ABCEGHJ-NPRSTVWXYZ]\d$/.test(postal)
    ) {
      setError(
        t(
          "Please check your contact details, Canadian postal code and service address.",
          "Vérifiez vos coordonnées, le code postal canadien et l’adresse de service.",
        ),
      );
      return;
    }
    if (!data.has("contact_consent")) {
      setError(
        t(
          "Please allow us to contact you about this request.",
          "Veuillez nous autoriser à vous contacter pour cette demande.",
        ),
      );
      return;
    }
    if (!(selection.province === "Ontario" ? /^[KLMNP]/ : /^[GHJ]/).test(postal)) {
      setError(
        t(
          "Please match the province to your service address so the estimate uses the right taxes.",
          "Veuillez choisir la province correspondant à l’adresse pour calculer les bonnes taxes.",
        ),
      );
      return;
    }
    if (value("preferred_date") && value("preferred_date") < today) {
      setError(
        t("Please choose today or a future date.", "Choisissez aujourd’hui ou une date future."),
      );
      return;
    }
    setBusy(true);
    const id = requestId.current ?? crypto.randomUUID();
    requestId.current = id;
    try {
      const parts = name.split(/\s+/),
        now = new Date().toISOString();
      const consent = data.has("quality_photos");
      const { error: saveError } = await supabase.rpc("submit_verified_quote_request", {
        p_email: email.trim().toLowerCase(),
        p_token: token,
        p_payload: {
          id,
          first_name: parts[0],
          last_name: parts.slice(1).join(" ") || null,
          phone,
          address_line: value("address"),
          city: value("city"),
          province: selection.province,
          postal_code: postal.slice(0, 3) + " " + postal.slice(3),
          service_name: selection.audience === "commercial" ? "Office Cleaning" : "House Cleaning",
          preferred_date: value("preferred_date") || null,
          preferred_time: null,
          description: value("notes") || null,
          preferred_language: locale,
          questionnaire_answers: {
            ...pricingAnswers(selection, estimate, locale),
            "Business name": value("company"),
            preferredContactMethod: value("contact_method"),
            preferredLanguage: locale,
            "Contact consent": "Yes",
            "Contact consent recorded at": now,
            "Quality photos consent": consent ? "Yes" : "No",
            "Quality photos consent scope":
              "Before and after service; private quality report shared with this customer; no promotional publication",
            "Quality photos consent recorded at": now,
            "Policy version": PRICING_VERSION,
            "Marketing consent": "Not requested",
          },
        },
      });
      if (saveError) throw saveError;
      // Once the request is saved, attachment/email failures must not create a second request.
      submitted.current = true;
      const uploads = await Promise.allSettled(
        files.map(async (file, index) => {
          const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `requests/${id}/${crypto.randomUUID()}-${name}`;
          const { error: uploadError } = await supabase.storage
            .from("service-photos")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          const { error: rowError } = await supabase.from("service_request_photos").insert({
            service_request_id: id,
            storage_path: path,
            caption: `Optional estimate photo ${index + 1}`,
          });
          if (rowError) throw rowError;
        }),
      );
      try {
        await sendCrmEmail({ type: "quote_requested", requestId: id });
      } catch {
        /* Request remains safely in the CRM. */
      }
      onSaved(
        id,
        uploads.some((r) => r.status === "rejected"),
      );
    } catch {
      setError(
        t(
          "We could not confirm your request. Please try again, or call (613) 407-6699 if the problem continues.",
          "Nous n’avons pas pu confirmer votre demande. Réessayez ou appelez le (613) 407-6699 si le problème persiste.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-i18n-ignore="true">
      <p className="text-sm leading-6 text-slate-600">
        {t(
          "No payment now. We will review your selection and send an official quote. Your appointment is confirmed after you accept the quote and agree on a date.",
          "Aucun paiement maintenant. Nous examinerons vos choix et enverrons un devis officiel. Le rendez-vous sera confirmé après acceptation du devis et accord sur la date.",
        )}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {selection.audience === "commercial" && (
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">
            {t("Business or organization", "Entreprise ou organisation")}
            <Input name="company" required maxLength={140} autoComplete="organization" />
          </label>
        )}
        <label className="grid gap-2 text-sm font-medium">
          {t("Full name", "Nom complet")} *
          <Input name="name" autoComplete="name" required maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("Email", "Courriel")} *
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={120}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setToken(null);
            }}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("Phone", "Téléphone")} *
          <Input name="phone" type="tel" autoComplete="tel" required maxLength={30} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("Service address", "Adresse de service")} *
          <Input name="address" autoComplete="street-address" required maxLength={140} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("City", "Ville")} *
          <Input name="city" autoComplete="address-level2" required maxLength={100} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("Province", "Province")} *
          <select
            name="province"
            value={selection.province}
            onChange={(e) => onProvinceChange(e.target.value as "Ontario" | "Quebec")}
            className="h-11 rounded-lg border bg-white px-3"
          >
            <option value="Ontario">Ontario</option>
            <option value="Quebec">Québec</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("Postal code", "Code postal")} *
          <Input
            name="postal_code"
            autoComplete="postal-code"
            required
            maxLength={7}
            placeholder="K1A 0B1"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("Preferred date · optional", "Date souhaitée · facultative")}
          <Input name="preferred_date" type="date" min={today} />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          {t("How should we contact you?", "Comment vous contacter ?")}
          <select name="contact_method" className="h-11 rounded-lg border bg-white px-3">
            <option value="Email">{t("Email", "Courriel")}</option>
            <option value="Phone">{t("Phone", "Téléphone")}</option>
            <option value="Text">{t("Text message", "Message texte")}</option>
          </select>
        </label>
      </div>
      <EmailVerification
        key={email.trim().toLowerCase()}
        email={email}
        purpose="quote"
        language={locale}
        token={token}
        onVerified={setToken}
      />
      <label className="grid gap-2 text-sm font-medium">
        {t(
          "Anything else we should know? · optional",
          "Autres renseignements utiles · facultatifs",
        )}
        <Textarea
          name="notes"
          rows={3}
          maxLength={1500}
          placeholder={t(
            "Access, parking, delicate surfaces or your priorities…",
            "Accès, stationnement, surfaces délicates ou vos priorités…",
          )}
        />
      </label>
      <div className="rounded-xl border border-dashed bg-slate-50/60 p-4">
        <p className="font-semibold">
          {t("Photos help us prepare your quote", "Les photos nous aident à préparer le devis")}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            "Recommended, never required. Up to 8 photos, 8 MB each. Avoid including people or personal documents.",
            "Recommandées, jamais obligatoires. Jusqu’à 8 photos de 8 Mo chacune. Évitez les personnes et documents personnels.",
          )}
        </p>
        <FileCameraInput
          label={t("Add optional photos", "Ajouter des photos facultatives")}
          files={files}
          onFilesChange={setFiles}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          maxFiles={8}
          maxSizeMB={8}
          disabled={busy}
          onBusyChange={setProcessing}
          className="mt-3"
        />
      </div>
      <div className="space-y-4 text-sm leading-6">
        <label className="flex items-start gap-3">
          <input
            className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
            type="checkbox"
            name="quality_photos"
          />
          <span>
            {t(
              "Optional: I authorize before-and-after photos during my service, for quality control and my private report. No advertising use. I can change my choice before photos are taken.",
              "Facultatif : j’autorise les photos avant et après l’intervention, pour le contrôle qualité et mon rapport privé. Aucun usage publicitaire. Je peux changer mon choix avant les prises de vue.",
            )}
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
            type="checkbox"
            name="contact_consent"
            required
          />
          <span>
            {t(
              "I agree that OMSG uses these details to prepare my quote and contact me about this request.",
              "J’accepte qu’OMSG utilise ces renseignements pour préparer le devis et me contacter au sujet de cette demande.",
            )}{" "}
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("Privacy policy", "Confidentialité")}
            </Link>{" "}
            ·{" "}
            <Link
              to="/pricing-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("Pricing policy", "Politique des prix")}
            </Link>
          </span>
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy || processing}
        className="h-auto min-h-12 w-full whitespace-normal bg-teal-800 px-5 py-3 text-base text-white hover:bg-teal-900"
      >
        {busy
          ? t("Sending your request…", "Envoi de votre demande…")
          : estimate.requiresVisit
            ? t("Request my free on-site visit", "Demander ma visite gratuite")
            : t("Send my official quote request", "Envoyer ma demande de devis officiel")}
      </Button>
    </form>
  );
}
