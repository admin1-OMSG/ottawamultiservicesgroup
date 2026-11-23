import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LoaderCircle,
  LogOut,
  Mail,
  Paperclip,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LanguageSwitcher, useLanguage } from "@/lib/language";
import { InteracSandboxPanel } from "@/features/interac/InteracSandboxPanel";
import { rememberProfessionalDestination, savedProfessionalDestination } from "@/features/marketplace/pro/model";
import { professionalSignInErrorMessage } from "@/features/professionals/sign-in-errors";
import {
  CANADIAN_PROVINCES,
  EMPTY_PROFESSIONAL_PROFILE,
  PROFESSIONAL_SERVICE_OPTIONS,
  isProfessionalEditable,
  professionalDocumentPath,
  professionalProfilePayload,
  professionalStatusLabel,
  profileToForm,
  validateProfessionalDocument,
  validateProfessionalProfile,
  type DocumentCategory,
  type ProfessionalAccount,
  type ProfessionalDocument,
  type ProfessionalProfileForm,
} from "@/features/professionals/model";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Professional account | Ottawa Multiservices Group" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ProfessionalPortal,
});

const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 disabled:bg-slate-100 disabled:text-slate-600 aria-invalid:border-red-500";
const primaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const accountSelect =
  "id,user_id,email,account_type,business_name,contact_name,phone,city,province,postal_code,website,google_maps_url,services,service_areas,preferred_language,review_status,review_message,submitted_at,reviewed_at,created_at,updated_at";
const documentSelect =
  "id,account_id,category,file_name,storage_path,mime_type,file_size,created_at";

function isSetupError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return ["42P01", "42883", "PGRST202", "PGRST205"].includes(code ?? "");
}

function ProfessionalPortal() {
  const navigate = Route.useNavigate();
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [account, setAccount] = useState<ProfessionalAccount | null>(null);
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [form, setForm] = useState<ProfessionalProfileForm>({ ...EMPTY_PROFESSIONAL_PROFILE });
  const [invalid, setInvalid] = useState<(keyof ProfessionalProfileForm)[]>([]);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [attested, setAttested] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [setupUnavailable, setSetupUnavailable] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("business_registration");
  const fileInput = useRef<HTMLInputElement>(null);
  const activeUser = useRef<string | null>(null);
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("offer")) rememberProfessionalDestination();
  }, []);

  useEffect(() => {
    let mounted = true;
    let authEventSeen = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventSeen = true;
      // Keep this callback synchronous. Supabase calls run in the separate effect below.
      if (mounted) setSession(next);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted || authEventSeen) return;
        setSession(data.session);
        if (sessionError) setError("Unable to restore your session. Please sign in again.");
      })
      .catch(() => {
        if (mounted && !authEventSeen) {
          setSession(null);
          setError("Unable to restore your session. Please sign in again.");
        }
      });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    activeUser.current = userId;
    setVerifiedUser(null);
    setAccount(null);
    setDocuments([]);
    setForm({ ...EMPTY_PROFESSIONAL_PROFILE });
    setAttested(false);
    setError("");
    setMessage("");
    setSetupUnavailable(false);
    setLoadFailed(false);
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (!cancelled && !userError && data.user?.id === userId) {
          try {
            const returnTo = window.localStorage.getItem("omsg.marketplace.returnTo");
            if (returnTo) {
              const destination = new URL(returnTo, window.location.origin);
              window.localStorage.removeItem("omsg.marketplace.returnTo");
              if (destination.origin === window.location.origin && destination.pathname === "/marketplace") {
                await navigate({ href: destination.pathname + destination.search, replace: true, reloadDocument: true });
                return;
              }
            }
          } catch {
            // The client area is still available when browser storage is disabled.
          }
        }
        if (userError || !data.user || data.user.id !== userId || !data.user.email_confirmed_at)
          throw new Error("Session could not be verified.");
        if (cancelled) return;
        setVerifiedUser(data.user);
        const result = await supabase
          .from("professional_accounts")
          .select(accountSelect)
          .eq("user_id", userId)
          .maybeSingle();
        if (result.error) throw result.error;
        if (cancelled) return;
        const row = result.data as ProfessionalAccount | null;
        if (row?.review_status === "approved") {
          const destination = savedProfessionalDestination();
          if (destination) {
            await navigate({ href: "/pro-market?" + destination.toString(), replace: true, reloadDocument: true });
            return;
          }
        }
        setAccount(row);
        if (row) {
          setForm(profileToForm(row));
          const docs = await supabase
            .from("professional_documents")
            .select(documentSelect)
            .eq("account_id", row.id)
            .order("created_at", { ascending: false });
          if (docs.error) throw docs.error;
          if (!cancelled) setDocuments((docs.data ?? []) as ProfessionalDocument[]);
        }
      } catch (failure) {
        if (cancelled) return;
        if (isSetupError(failure)) setSetupUnavailable(true);
        setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (activeUser.current === userId) activeUser.current = null;
    };
  }, [userId, loadAttempt, navigate]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const editable = isProfessionalEditable(account?.review_status);
  const documentLabels: Record<DocumentCategory, string> = {
    business_registration: t("Business registration", "Immatriculation de l’entreprise"),
    insurance: t("Liability insurance", "Assurance responsabilité"),
    trade_licence: t("Trade licence or qualification", "Permis ou qualification professionnelle"),
    other: t("Other supporting document", "Autre justificatif"),
  };

  function reportFailure(failure: unknown) {
    if (isSetupError(failure)) setSetupUnavailable(true);
    setError(
      t(
        "This action could not be completed. Please try again. Your application has not been submitted unless its status says ‘Under review’.",
        "Cette action n’a pas pu être terminée. Réessayez. Votre dossier est soumis uniquement si son statut indique « En cours d’examen ».",
      ),
    );
  }

  async function requestSignIn(event?: FormEvent) {
    event?.preventDefault();
    if (busy || cooldown || !consent) return;
    setBusy("auth");
    setError("");
    setMessage("");
    const destination = (sentEmail || email).trim().toLowerCase();
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: destination,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/pro` },
      });
      if (authError) throw authError;
      setSentEmail(destination);
      setCooldown(60);
      setMessage(
        t(
          "Check your email and follow the secure sign-in link. If the email contains a code, you can enter it below.",
          "Consultez votre courriel et suivez le lien de connexion sécurisé. Si le message contient un code, vous pouvez le saisir ci-dessous.",
        ),
      );
    } catch (failure) {
      setError(professionalSignInErrorMessage(failure, language));
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!sentEmail || busy) return;
    setBusy("verify");
    setError("");
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        email: sentEmail,
        token: token.trim(),
        type: "email",
      });
      if (authError) throw authError;
      setToken("");
      setMessage("");
    } catch {
      setError(
        t(
          "This code is invalid or has expired. Check it or request a new sign-in email.",
          "Ce code est invalide ou expiré. Vérifiez-le ou demandez un nouveau courriel de connexion.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function reloadAccount(expectedUser: string) {
    const result = await supabase
      .from("professional_accounts")
      .select(accountSelect)
      .eq("user_id", expectedUser)
      .single();
    if (result.error) throw result.error;
    if (activeUser.current !== expectedUser) return null;
    const row = result.data as ProfessionalAccount;
    setAccount(row);
    return row;
  }

  async function saveProfile(submit: boolean) {
    if (!verifiedUser || busy || !editable) return;
    const expectedUser = verifiedUser.id;
    const problems = submit ? validateProfessionalProfile(form) : [];
    setInvalid(problems);
    setError("");
    setMessage("");
    if (problems.length) {
      setError(
        t(
          "Please complete the highlighted fields before submitting your application.",
          "Veuillez compléter les champs indiqués avant de soumettre votre dossier.",
        ),
      );
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    if (submit && !attested) {
      setError(
        t(
          "Please confirm that your information is accurate before submitting.",
          "Veuillez confirmer l’exactitude de vos informations avant de soumettre votre dossier.",
        ),
      );
      return;
    }
    setBusy(submit ? "submit" : "save");
    try {
      const saved = await supabase.rpc("save_my_professional_account", {
        p_profile: professionalProfilePayload(form, language),
      });
      if (saved.error) throw saved.error;
      if (activeUser.current !== expectedUser) return;
      if (submit) {
        const submitted = await supabase.rpc("submit_my_professional_account");
        if (submitted.error) throw submitted.error;
      }
      const row = await reloadAccount(expectedUser);
      if (!row) return;
      setForm(profileToForm(row));
      setAttested(false);
      setMessage(
        submit
          ? t(
              "Your application has been submitted for review. You can follow its progress here.",
              "Votre dossier a été soumis pour examen. Vous pouvez suivre son avancement ici.",
            )
          : t(
              "Your draft has been saved. Add any relevant documents, then submit your application.",
              "Votre brouillon est enregistré. Ajoutez les justificatifs pertinents, puis soumettez votre dossier.",
            ),
      );
    } catch (failure) {
      if (activeUser.current === expectedUser) reportFailure(failure);
    } finally {
      setBusy(null);
    }
  }

  async function uploadDocument(file: File) {
    if (!account || !verifiedUser || busy || !editable) return;
    const problem = validateProfessionalDocument(file);
    if (problem) {
      setError(
        problem === "size"
          ? t(
              "Choose a non-empty file no larger than 8 MB.",
              "Choisissez un fichier non vide de 8 Mo maximum.",
            )
          : t("Choose a PDF, JPG or PNG file.", "Choisissez un fichier PDF, JPG ou PNG."),
      );
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const expectedUser = verifiedUser.id;
    const path = professionalDocumentPath(expectedUser, account.id, crypto.randomUUID(), file.name);
    setBusy("upload");
    setError("");
    setMessage("");
    let uploaded = false;
    try {
      const result = await supabase.storage
        .from("professional-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) throw result.error;
      uploaded = true;
      const registered = await supabase.rpc("register_my_professional_document", {
        p_category: category,
        p_storage_path: path,
        p_file_name: file.name,
        p_mime_type: file.type,
        p_file_size: file.size,
      });
      if (registered.error) throw registered.error;
      uploaded = false;
      const docs = await supabase
        .from("professional_documents")
        .select(documentSelect)
        .eq("account_id", account.id)
        .order("created_at", { ascending: false });
      if (docs.error) throw docs.error;
      if (activeUser.current === expectedUser) {
        setDocuments((docs.data ?? []) as ProfessionalDocument[]);
        setMessage(
          t(
            "Document added to your private application.",
            "Justificatif ajouté à votre dossier privé.",
          ),
        );
      }
    } catch (failure) {
      if (uploaded) await supabase.storage.from("professional-documents").remove([path]);
      if (activeUser.current === expectedUser) reportFailure(failure);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeDocument(doc: ProfessionalDocument) {
    if (!account || !verifiedUser || busy || !editable) return;
    const expectedUser = verifiedUser.id;
    setBusy(doc.id);
    setError("");
    setMessage("");
    try {
      const removed = await supabase.storage
        .from("professional-documents")
        .remove([doc.storage_path]);
      if (removed.error) throw removed.error;
      const result = await supabase.rpc("remove_my_professional_document", {
        p_document_id: doc.id,
      });
      if (result.error) throw result.error;
      if (activeUser.current === expectedUser)
        setDocuments((current) => current.filter((item) => item.id !== doc.id));
    } catch (failure) {
      if (activeUser.current === expectedUser) reportFailure(failure);
    } finally {
      setBusy(null);
    }
  }

  async function openDocument(doc: ProfessionalDocument) {
    if (!verifiedUser) return;
    const expectedUser = verifiedUser.id;
    setError("");
    try {
      const { data, error: downloadError } = await supabase.storage
        .from("professional-documents")
        .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
      if (downloadError || !data?.signedUrl) throw downloadError;
      if (activeUser.current !== expectedUser) return;
      const anchor = document.createElement("a");
      anchor.href = data.signedUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
    } catch (failure) {
      reportFailure(failure);
    }
  }

  async function logout() {
    setBusy("logout");
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError)
      setError(
        t("We could not sign you out. Please try again.", "La déconnexion a échoué. Réessayez."),
      );
    else {
      setSession(null);
      setSentEmail("");
      setEmail("");
      setConsent(false);
      setToken("");
    }
    setBusy(null);
  }

  function update<K extends keyof ProfessionalProfileForm>(
    key: K,
    value: ProfessionalProfileForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setInvalid((current) => current.filter((field) => field !== key));
    setMessage("");
  }

  const busyIcon = <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" data-i18n-ignore="true">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label={t("OMSG home", "Accueil OMSG")}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-lg font-black text-slate-950">
              O
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-tight sm:text-base">
                Ottawa MSG
              </span>
              <span className="block text-[10px] tracking-[.16em] text-slate-500">
                MULTI SERVICES GROUP
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <a href="/pro-pricing" className="text-sm font-semibold text-teal-800 hover:underline">{t("Pro pricing", "Tarifs pros")}</a>
            <a href="/marketplace" className="text-sm font-semibold text-teal-800 hover:underline">{t("Client area", "Espace client")}</a>
            {account?.review_status === "approved" && <a href="/pro-market" className={primaryClass}>{t("View requests", "Voir les demandes")}</a>}
            <LanguageSwitcher compact />
            {session && (
              <button
                type="button"
                onClick={() => void logout()}
                disabled={Boolean(busy)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Sign out", "Déconnexion")}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {session === undefined ? (
        <main className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-20" aria-live="polite">
          {busyIcon}
          {t("Checking your session…", "Vérification de votre session…")}
        </main>
      ) : !session ? (
        <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <section className="max-w-xl lg:pt-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-800">
              {t("OMSG PROFESSIONALS", "PROFESSIONNELS OMSG")}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {t(
                "Your expertise starts with a strong profile.",
                "Votre expertise commence par un bon profil.",
              )}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {t(
                "Create your professional account and tell us about your services. Companies and independent professionals are welcome.",
                "Créez votre compte professionnel et présentez vos services. Entreprises et travailleurs autonomes sont les bienvenus.",
              )}
            </p>
            <ol className="mt-8 space-y-5">
              {[
                [
                  Mail,
                  t("Confirm your email", "Confirmez votre courriel"),
                  t(
                    "A secure link gives you access to your account.",
                    "Un lien sécurisé vous donne accès à votre compte.",
                  ),
                ],
                [
                  UserRound,
                  t("Complete your profile", "Complétez votre profil"),
                  t(
                    "Describe your services and the areas you cover.",
                    "Précisez vos services et les secteurs que vous desservez.",
                  ),
                ],
                [
                  FileCheck2,
                  t("Submit your application", "Soumettez votre dossier"),
                  t(
                    "Add relevant documents and follow your review status.",
                    "Ajoutez les justificatifs pertinents et suivez l’examen de votre dossier.",
                  ),
                ],
              ].map(([Icon, title, detail], index) => {
                const StepIcon = Icon as typeof Mail;
                return (
                  <li key={index} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-teal-800">
                      <StepIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold">{title as string}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{detail as string}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
          <section
            className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            aria-labelledby="pro-signin-title"
          >
            <div className="mb-5 inline-flex rounded-xl bg-orange-50 p-3 text-orange-700">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 id="pro-signin-title" className="text-2xl font-bold">
              {t("Create or access your account", "Créer un compte ou se connecter")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t(
                "Use the same email each time. No password is needed.",
                "Utilisez toujours la même adresse courriel. Aucun mot de passe n’est nécessaire.",
              )}
            </p>
            {error && <Notice kind="error">{error}</Notice>}
            {message && <Notice>{message}</Notice>}
            {!sentEmail ? (
              <form onSubmit={(event) => void requestSignIn(event)} className="mt-6 space-y-5">
                <Field label={t("Email address", "Adresse courriel")}>
                  <input
                    id="pro-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClass}
                    placeholder="vous@entreprise.ca"
                  />
                </Field>
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    required
                    className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
                  />
                  <span>
                    {t("I agree to the", "J’accepte les")}{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-teal-800 underline"
                    >
                      {t("terms of use", "conditions d’utilisation")}
                    </Link>{" "}
                    {t("and have read the", "et j’ai lu la")}{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-teal-800 underline"
                    >
                      {t("privacy policy", "politique de confidentialité")}
                    </Link>
                    .
                  </span>
                </label>
                <button disabled={Boolean(busy) || !consent} className={`${primaryClass} w-full`}>
                  {busy ? busyIcon : <Mail className="h-4 w-4" />}
                  {t("Email me a sign-in link", "Recevoir mon lien de connexion")}
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-5">
                <p className="break-all rounded-xl bg-slate-50 p-3 text-sm font-semibold">
                  {sentEmail}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {t(
                    "Open the link in your email to continue. Check your spam folder if needed.",
                    "Ouvrez le lien reçu par courriel pour continuer. Vérifiez les courriels indésirables au besoin.",
                  )}
                </p>
                <details className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t("My email includes a code", "Mon courriel contient un code")}
                  </summary>
                  <form onSubmit={(event) => void verifyCode(event)} className="mt-4 space-y-3">
                    <Field label={t("Email code", "Code reçu par courriel")}>
                      <input
                        required
                        value={token}
                        onChange={(event) => setToken(event.target.value.replace(/\s/g, ""))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        minLength={6}
                        maxLength={10}
                        className={fieldClass}
                      />
                    </Field>
                    <button disabled={Boolean(busy)} className={`${primaryClass} w-full`}>
                      {busy === "verify" ? busyIcon : <ArrowRight className="h-4 w-4" />}
                      {t("Verify code", "Vérifier le code")}
                    </button>
                  </form>
                </details>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy) || cooldown > 0}
                    onClick={() => void requestSignIn()}
                    className={secondaryClass}
                  >
                    {cooldown > 0
                      ? t(`Resend in ${cooldown}s`, `Renvoyer dans ${cooldown} s`)
                      : t("Resend email", "Renvoyer le courriel")}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setSentEmail("");
                      setToken("");
                      setMessage("");
                      setCooldown(0);
                    }}
                    className={secondaryClass}
                  >
                    {t("Change email", "Changer d’adresse")}
                  </button>
                </div>
              </div>
            )}
            <p className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {t(
                "Email confirmation secures account access. Your professional application is reviewed separately.",
                "La confirmation du courriel sécurise l’accès au compte. Votre dossier professionnel fait l’objet d’un examen distinct.",
              )}
            </p>
          </section>
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-800">
                {t("PROFESSIONAL ACCOUNT", "ESPACE PROFESSIONNEL")}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("Your professional profile", "Votre profil professionnel")}
              </h1>
              <p className="mt-2 break-all text-sm text-slate-500">
                {verifiedUser?.email ?? session.user.email}
              </p>
            </div>
            {account && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${account.review_status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {account.review_status === "approved" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
                {professionalStatusLabel(account.review_status, language)}
              </span>
            )}
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          {message && <Notice>{message}</Notice>}
          {loading ? (
            <div className="mt-10 flex items-center gap-3" aria-live="polite">
              {busyIcon}
              {t("Loading your application…", "Chargement de votre dossier…")}
            </div>
          ) : setupUnavailable ? (
            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-bold text-amber-950">
                {t(
                  "Professional registration is not available yet",
                  "L’inscription professionnelle n’est pas encore disponible",
                )}
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {t(
                  "Please try again later or contact OMSG. Your application cannot be edited while registration is unavailable.",
                  "Veuillez réessayer plus tard ou contacter OMSG. Votre dossier ne peut pas être modifié pendant cette indisponibilité.",
                )}
              </p>
              <Link to="/contact" className={`${secondaryClass} mt-4`}>
                {t("Contact OMSG", "Contacter OMSG")}
              </Link>
            </section>
          ) : loadFailed ? (
            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6" role="alert">
              <h2 className="font-bold text-red-950">
                {t("We could not load your application", "Impossible de charger votre dossier")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-red-800">
                {t(
                  "Please retry before making changes. If the problem continues, sign out and sign in again.",
                  "Réessayez avant d’apporter des modifications. Si le problème persiste, déconnectez-vous puis reconnectez-vous.",
                )}
              </p>
              <button
                type="button"
                onClick={() => setLoadAttempt((value) => value + 1)}
                className={`${secondaryClass} mt-4`}
              >
                {t("Retry", "Réessayer")}
              </button>
            </section>
          ) : !verifiedUser ? (
            <Notice kind="error">
              {t(
                "We could not verify your session. Sign out and sign in again to continue.",
                "Votre session n’a pas pu être vérifiée. Déconnectez-vous puis reconnectez-vous pour continuer.",
              )}
            </Notice>
          ) : (
            <>
              {account && !editable && (
                <section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
                  <h2 className="font-bold text-teal-950">
                    {account.review_status === "pending_review"
                      ? t(
                          "Your application is being reviewed",
                          "Votre dossier est en cours d’examen",
                        )
                      : account.review_status === "approved"
                        ? t("Your application has been approved", "Votre dossier a été approuvé")
                        : t(
                            "Please contact OMSG about your account",
                            "Veuillez contacter OMSG au sujet de votre compte",
                          )}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-teal-900">
                    {account.review_status === "pending_review"
                      ? t(
                          "Your profile and documents are locked during review. Any requested changes will appear here.",
                          "Votre profil et vos justificatifs sont verrouillés pendant l’examen. Toute demande de modification apparaîtra ici.",
                        )
                      : account.review_status === "approved"
                        ? t(
                            "This status records the review of your application. It does not certify identity, background checks or every professional qualification. Contact OMSG to update your dossier.",
                            "Ce statut correspond à l’examen de votre dossier. Il ne certifie pas votre identité, vos antécédents ou l’ensemble de vos qualifications. Contactez OMSG pour modifier votre dossier.",
                          )
                        : t(
                            "Your profile is currently locked. Contact OMSG for further information.",
                            "Votre profil est actuellement verrouillé. Contactez OMSG pour en savoir plus.",
                          )}
                  </p>
                </section>
              )}
              {account?.review_message && (
                <Notice kind={account.review_status === "changes_requested" ? "warning" : "info"}>
                  <strong className="block">{t("Message from OMSG", "Message d’OMSG")}</strong>
                  <p className="mt-1 whitespace-pre-wrap">{account.review_message}</p>
                </Notice>
              )}
              {import.meta.env.VITE_INTERAC_SANDBOX_ENABLED === "true" &&
                account &&
                session.access_token &&
                verifiedUser?.id === session.user.id &&
                account.user_id === session.user.id && (
                  <InteracSandboxPanel
                    key={account.id}
                    accessToken={session.access_token}
                    language={language}
                  />
                )}
              <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveProfile(false);
                  }}
                  noValidate
                  className="min-w-0 space-y-6"
                >
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <SectionTitle
                      number="1"
                      title={t("Your business", "Votre activité")}
                      detail={t(
                        "Use accurate contact details for your application.",
                        "Indiquez des coordonnées exactes pour votre dossier.",
                      )}
                    />
                    <fieldset
                      disabled={!editable || Boolean(busy)}
                      className="mt-6 grid gap-5 sm:grid-cols-2"
                    >
                      <Field label={t("Professional type", "Type de professionnel")}>
                        <select
                          value={form.account_type}
                          onChange={(event) =>
                            update(
                              "account_type",
                              event.target.value as ProfessionalProfileForm["account_type"],
                            )
                          }
                          className={fieldClass}
                        >
                          <option value="company">{t("Company", "Entreprise")}</option>
                          <option value="individual">
                            {t("Independent professional", "Travailleur autonome")}
                          </option>
                        </select>
                      </Field>
                      <Field
                        label={
                          form.account_type === "company"
                            ? t("Business name *", "Nom de l’entreprise *")
                            : t("Trading name (optional)", "Nom commercial (facultatif)")
                        }
                        error={invalid.includes("business_name")}
                      >
                        <input
                          value={form.business_name}
                          onChange={(event) => update("business_name", event.target.value)}
                          maxLength={160}
                          autoComplete="organization"
                          aria-invalid={invalid.includes("business_name")}
                          className={fieldClass}
                        />
                      </Field>
                      <Field
                        label={t("Contact name *", "Nom du contact *")}
                        error={invalid.includes("contact_name")}
                      >
                        <input
                          value={form.contact_name}
                          onChange={(event) => update("contact_name", event.target.value)}
                          maxLength={160}
                          autoComplete="name"
                          aria-invalid={invalid.includes("contact_name")}
                          className={fieldClass}
                        />
                      </Field>
                      <Field
                        label={t("Phone number *", "Numéro de téléphone *")}
                        error={invalid.includes("phone")}
                      >
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(event) => update("phone", event.target.value)}
                          maxLength={40}
                          autoComplete="tel"
                          placeholder="613 555 0123"
                          aria-invalid={invalid.includes("phone")}
                          className={fieldClass}
                        />
                      </Field>
                      <Field label={t("City *", "Ville *")} error={invalid.includes("city")}>
                        <input
                          value={form.city}
                          onChange={(event) => update("city", event.target.value)}
                          maxLength={100}
                          autoComplete="address-level2"
                          aria-invalid={invalid.includes("city")}
                          className={fieldClass}
                        />
                      </Field>
                      <Field label={t("Province / territory *", "Province / territoire *")}>
                        <select
                          value={form.province}
                          onChange={(event) => update("province", event.target.value)}
                          autoComplete="address-level1"
                          aria-invalid={invalid.includes("province")}
                          className={fieldClass}
                        >
                          {CANADIAN_PROVINCES.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label={t("Postal code *", "Code postal *")}
                        error={invalid.includes("postal_code")}
                      >
                        <input
                          value={form.postal_code}
                          onChange={(event) =>
                            update("postal_code", event.target.value.toUpperCase())
                          }
                          maxLength={7}
                          autoComplete="postal-code"
                          placeholder="K1A 0B1"
                          aria-invalid={invalid.includes("postal_code")}
                          className={`${fieldClass} uppercase`}
                        />
                      </Field>
                      <Field label={t("Google Maps listing (optional)", "Fiche Google Maps (facultatif)")} error={invalid.includes("google_maps_url")}>
                        <input type="url" value={form.google_maps_url ?? ""} maxLength={2048} onChange={event => update("google_maps_url", event.target.value)} aria-invalid={invalid.includes("google_maps_url")} className={fieldClass} placeholder="https://maps.app.goo.gl/…" />
                      </Field>
                      <Field
                        label={t("Website (optional)", "Site web (facultatif)")}
                        error={invalid.includes("website")}
                      >
                        <input
                          type="url"
                          value={form.website}
                          onChange={(event) => update("website", event.target.value)}
                          maxLength={500}
                          autoComplete="url"
                          placeholder="https://exemple.ca"
                          aria-invalid={invalid.includes("website")}
                          className={fieldClass}
                        />
                      </Field>
                    </fieldset>
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <SectionTitle
                      number="2"
                      title={t("Services and coverage", "Services et secteurs")}
                      detail={t(
                        "Choose the services you provide and the places you serve.",
                        "Choisissez vos services et précisez les secteurs desservis.",
                      )}
                    />
                    <fieldset disabled={!editable || Boolean(busy)} className="mt-6">
                      <legend className="text-sm font-semibold">
                        {t("Services offered *", "Services offerts *")}
                      </legend>
                      <div
                        className={`mt-3 grid gap-2 sm:grid-cols-2 ${invalid.includes("services") ? "rounded-xl ring-2 ring-red-300" : ""}`}
                      >
                        {PROFESSIONAL_SERVICE_OPTIONS.map((service) => (
                          <label
                            key={service.value}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm has-checked:border-teal-700 has-checked:bg-teal-50"
                          >
                            <input
                              type="checkbox"
                              checked={form.services.includes(service.value)}
                              onChange={(event) =>
                                update(
                                  "services",
                                  event.target.checked
                                    ? [...form.services, service.value]
                                    : form.services.filter((value) => value !== service.value),
                                )
                              }
                              className="h-4 w-4 shrink-0 accent-teal-800"
                            />
                            {service[language]}
                          </label>
                        ))}
                      </div>
                      <div className="mt-5">
                        <Field
                          label={t("Cities or areas served *", "Villes ou secteurs desservis *")}
                          error={invalid.includes("service_areas")}
                        >
                          <textarea
                            value={form.service_areas}
                            onChange={(event) => update("service_areas", event.target.value)}
                            maxLength={2500}
                            rows={3}
                            aria-invalid={invalid.includes("service_areas")}
                            placeholder="Ottawa, Gatineau, Orléans, Kanata"
                            className={fieldClass}
                          />
                          <span className="mt-2 block text-xs text-slate-500">
                            {t(
                              "Separate each area with a comma.",
                              "Séparez les secteurs par une virgule.",
                            )}
                          </span>
                        </Field>
                      </div>
                    </fieldset>
                    {editable && (
                      <button disabled={Boolean(busy)} className={`${secondaryClass} mt-6`}>
                        {busy === "save" ? busyIcon : <Check className="h-4 w-4" />}
                        {t("Save draft", "Enregistrer le brouillon")}
                      </button>
                    )}
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <SectionTitle
                      number="3"
                      title={t("Supporting documents", "Justificatifs")}
                      detail={t(
                        "Add relevant registration, insurance or qualification documents, where applicable. Do not upload identity cards or police records here.",
                        "Ajoutez les documents d’immatriculation, d’assurance ou de qualification pertinents, selon votre activité. Ne déposez pas de pièce d’identité ni de dossier de police ici.",
                      )}
                    />
                    <div className="mt-5 space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <Paperclip className="h-5 w-5 shrink-0 text-teal-700" />
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => void openDocument(doc)}
                              className="block max-w-full truncate text-left text-sm font-semibold text-teal-800 underline underline-offset-2"
                            >
                              {doc.file_name}
                            </button>
                            <p className="mt-1 text-xs text-slate-500">
                              {documentLabels[doc.category]} ·{" "}
                              {(doc.file_size / 1024 / 1024).toFixed(1)} {t("MB", "Mo")}
                            </p>
                          </div>
                          {editable && (
                            <button
                              type="button"
                              onClick={() => void removeDocument(doc)}
                              disabled={Boolean(busy)}
                              aria-label={t(`Remove ${doc.file_name}`, `Retirer ${doc.file_name}`)}
                              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {busy === doc.id ? busyIcon : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {editable &&
                      (!account ? (
                        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                          {t(
                            "Save your draft first to add documents.",
                            "Enregistrez d’abord votre brouillon pour ajouter des justificatifs.",
                          )}
                        </p>
                      ) : (
                        <fieldset
                          disabled={Boolean(busy)}
                          className="mt-5 space-y-4 rounded-xl border border-dashed border-slate-300 p-4"
                        >
                          <Field label={t("Document type", "Type de justificatif")}>
                            <select
                              value={category}
                              onChange={(event) =>
                                setCategory(event.target.value as DocumentCategory)
                              }
                              className={fieldClass}
                            >
                              {Object.entries(documentLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <label className="block text-sm font-semibold">
                            {t("Add a document", "Ajouter un justificatif")}
                            <input
                              ref={fileInput}
                              type="file"
                              disabled={documents.length >= 10}
                              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadDocument(file);
                              }}
                              className="mt-2 block w-full min-w-0 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-3 file:font-semibold file:text-teal-800"
                            />
                          </label>
                          <p className="flex items-center gap-2 text-xs text-slate-500">
                            {busy === "upload" ? busyIcon : <Upload className="h-4 w-4" />}
                            {t(
                              "PDF, JPG or PNG · maximum 8 MB per file · 10 files maximum",
                              "PDF, JPG ou PNG · maximum 8 Mo par fichier · 10 fichiers maximum",
                            )}
                          </p>
                          {documents.length >= 10 && (
                            <p className="text-xs leading-5 text-amber-800">
                              {t(
                                "Remove an existing document before adding another.",
                                "Retirez un justificatif existant avant d’en ajouter un autre.",
                              )}
                            </p>
                          )}
                        </fieldset>
                      ))}
                    {!documents.length && !editable && (
                      <p className="mt-4 text-sm text-slate-500">
                        {t(
                          "No supporting documents were added.",
                          "Aucun justificatif n’a été ajouté.",
                        )}
                      </p>
                    )}
                    <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      {t(
                        "Documents are private and accessible to you and authorized OMSG reviewers.",
                        "Les justificatifs sont privés et accessibles à vous et aux responsables OMSG autorisés.",
                      )}
                    </p>
                  </section>
                </form>
                <aside className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6 sm:p-6">
                  <FileText className="h-6 w-6 text-teal-800" />
                  <h2 className="mt-3 text-lg font-bold">
                    {t("Submit for review", "Soumettre pour examen")}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {t(
                      "OMSG will review your profile and relevant supporting information. Additional information may be requested according to your services.",
                      "OMSG examinera votre profil et les justificatifs pertinents. Des informations complémentaires pourront être demandées selon vos services.",
                    )}
                  </p>
                  {editable ? (
                    <>
                      <label className="mt-5 flex items-start gap-3 text-sm leading-6">
                        <input
                          type="checkbox"
                          checked={attested}
                          onChange={(event) => setAttested(event.target.checked)}
                          disabled={Boolean(busy)}
                          className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
                        />
                        <span>
                          {t(
                            "I confirm that my information is accurate, that I am authorized to provide these services and that my documents may be reviewed by OMSG.",
                            "Je confirme l’exactitude de mes informations, être autorisé à offrir ces services et autoriser l’examen de mes justificatifs par OMSG.",
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        disabled={Boolean(busy) || !attested}
                        onClick={() => void saveProfile(true)}
                        className={`${primaryClass} mt-5 w-full`}
                      >
                        {busy === "submit" ? busyIcon : <ArrowRight className="h-4 w-4" />}
                        {account?.review_status === "changes_requested"
                          ? t("Submit updated application", "Soumettre le dossier corrigé")
                          : t("Submit my application", "Soumettre mon dossier")}
                      </button>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {t(
                          "Your current profile is saved when you submit. Editing is paused during review.",
                          "Votre profil est enregistré lors de la soumission. Les modifications sont suspendues pendant l’examen.",
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold">
                      {professionalStatusLabel(account!.review_status, language)}
                    </div>
                  )}
                  <div className="mt-6 border-t border-slate-100 pt-5 text-sm">
                    <Link
                      to="/contact"
                      className="font-semibold text-teal-800 underline underline-offset-2"
                    >
                      {t("Need help? Contact OMSG", "Besoin d’aide ? Contactez OMSG")}
                    </Link>
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
      )}
      <footer className="mx-auto max-w-6xl border-t border-slate-200 px-4 py-6 text-xs text-slate-500 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Ottawa Multiservices Group Inc.</span>
          <div className="flex gap-5">
            <Link to="/privacy" className="underline">
              {t("Privacy", "Confidentialité")}
            </Link>
            <Link to="/terms" className="underline">
              {t("Terms", "Conditions")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-700">
      <span className={error ? "text-red-700" : ""}>
        {label}
        {error && " !"}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-sm font-bold text-teal-800">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function Notice({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "error" | "warning" | "info";
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${kind === "error" ? "border-red-200 bg-red-50 text-red-800" : kind === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-teal-200 bg-teal-50 text-teal-900"}`}
    >
      {children}
    </div>
  );
}
