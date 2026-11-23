import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireActiveAdmin } from "@/features/admin/requireAdmin";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/professionals")({ component: ProfessionalsPage });

type Status = "draft" | "pending_review" | "changes_requested" | "approved" | "suspended";
type Account = {
  id: string;
  user_id: string;
  email: string;
  account_type: string;
  business_name: string | null;
  contact_name: string;
  phone: string;
  city: string;
  province: string;
  postal_code: string;
  website: string | null;
  services: string[];
  service_areas: string[];
  preferred_language: string;
  review_status: Status;
  review_message: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};
type Document = {
  id: string;
  account_id: string;
  file_name: string;
  category: string;
  storage_path: string;
  created_at: string;
  url?: string;
};
const accountColumns =
  "id,user_id,email,account_type,business_name,contact_name,phone,city,province,postal_code,website,services,service_areas,preferred_language,review_status,review_message,submitted_at,reviewed_at,created_at,updated_at";
const statusColours: Record<Status, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-100 text-amber-900",
  changes_requested: "bg-orange-100 text-orange-900",
  approved: "bg-emerald-100 text-emerald-900",
  suspended: "bg-red-100 text-red-800",
};

function ProfessionalsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const fr = language === "fr";
  const text = (en: string, french: string) => (fr ? french : en);
  const labels: Record<Status, string> = {
    draft: text("Draft", "Brouillon"),
    pending_review: text("Awaiting review", "À examiner"),
    changes_requested: text("Changes requested", "Compléments demandés"),
    approved: text("Application approved", "Dossier approuvé"),
    suspended: text("Suspended", "Suspendu"),
  };
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("pending_review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [documentReload, setDocumentReload] = useState(0);
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [authIdentity, setAuthIdentity] = useState<string | null>();
  const authIdentityRef = useRef<string | null | undefined>(undefined);
  const loadVersion = useRef(0);
  const invalidateLoads = useCallback(() => {
    loadVersion.current++;
  }, []);
  const selected = accounts.find((a) => a.id === selectedId);
  const visible = useMemo(
    () =>
      accounts.filter(
        (account) =>
          (filter === "all" || account.review_status === filter) &&
          [
            account.business_name,
            account.contact_name,
            account.email,
            account.city,
            ...account.services,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [accounts, query, filter],
  );

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const identity = session?.user.id ?? null;
      if (identity === authIdentityRef.current) return;
      authIdentityRef.current = identity;
      invalidateLoads();
      setAccounts([]);
      setSelectedId(null);
      setDocuments([]);
      setSuccess("");
      setError("");
      setMessage("");
      setReviewed(false);
      setAuthIdentity(identity);
    });
    return () => {
      invalidateLoads();
      data.subscription.unsubscribe();
    };
  }, [invalidateLoads]);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const admin = await requireActiveAdmin();
      if (version !== loadVersion.current) return;
      if (!admin || admin.id !== authIdentity) {
        await navigate({ to: "/admin/login" });
        return;
      }
      const result = await supabase
        .from("professional_accounts")
        .select(accountColumns)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (result.error) throw result.error;
      if (version === loadVersion.current) setAccounts((result.data ?? []) as Account[]);
    } catch {
      if (version === loadVersion.current) {
        setAccounts([]);
        setError(
          fr
            ? "Impossible de charger les dossiers. Réessayez. Lors de la première installation, terminez la configuration de l’espace professionnel avant d’accepter des inscriptions."
            : "Professional applications could not be loaded. Please retry. If this is the first installation, complete the professional portal setup before accepting applications.",
        );
      }
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [authIdentity, navigate, fr]);

  useEffect(() => {
    if (authIdentity !== undefined) void load();
  }, [authIdentity, load]);

  useEffect(() => {
    let cancelled = false;
    setDocuments([]);
    setDocumentError("");
    setMessage("");
    setReviewed(false);
    if (!selectedId) return;
    setDocumentsLoading(true);
    async function loadDocuments() {
      try {
        const result = await supabase
          .from("professional_documents")
          .select("id,account_id,file_name,category,storage_path,created_at")
          .eq("account_id", selectedId)
          .order("created_at");
        if (result.error) throw result.error;
        const rows = (result.data ?? []) as Document[];
        if (rows.length) {
          const signed = await supabase.storage.from("professional-documents").createSignedUrls(
            rows.map((d) => d.storage_path),
            300,
          );
          if (signed.error || signed.data?.some((item) => item.error || !item.signedUrl))
            throw signed.error ?? new Error("Document access failed");
          const urls = new Map(signed.data?.map((item) => [item.path, item.signedUrl]));
          if (!cancelled)
            setDocuments(rows.map((d) => ({ ...d, url: urls.get(d.storage_path) ?? undefined })));
        }
      } catch {
        if (!cancelled)
          setDocumentError(
            fr
              ? "Impossible d’ouvrir les pièces justificatives. Réessayez avant de prendre une décision."
              : "Supporting documents could not be opened. Retry before making a decision.",
          );
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    }
    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [selectedId, documentReload, fr]);

  async function review(decision: "approved" | "changes_requested" | "suspended") {
    if (!selected || saving) return;
    setError("");
    setSuccess("");
    if (!reviewed || !message.trim()) {
      setError(
        text(
          "Confirm your review and add a message for the professional.",
          "Confirmez votre examen et ajoutez un message destiné au professionnel.",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      if (!(await requireActiveAdmin())) {
        await navigate({ to: "/admin/login" });
        return;
      }
      const result = await supabase.rpc("review_professional_account", {
        p_account_id: selected.id,
        p_decision: decision,
        p_message: message.trim(),
        p_expected_updated_at: selected.updated_at,
      });
      if (result.error) throw result.error;
      setSuccess(
        text(
          "The decision has been saved. The professional can see it in their account.",
          "La décision a été enregistrée. Le professionnel peut la consulter dans son compte.",
        ),
      );
      setSelectedId(null);
      await load();
    } catch {
      setError(
        text(
          "The decision could not be saved. Reload the application and try again; another administrator may have changed it.",
          "La décision n’a pas pu être enregistrée. Rechargez le dossier puis réessayez ; un autre administrateur l’a peut-être modifié.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function show(account: Account) {
    setSelectedId(account.id);
    setSuccess("");
  }
  function formatDate(value: string | null) {
    return value
      ? new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", {
          dateStyle: "medium",
          timeZone: "America/Toronto",
        }).format(new Date(value))
      : "—";
  }
  function badge(status: Status) {
    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColours[status]}`}
      >
        {labels[status]}
      </span>
    );
  }

  return (
    <div data-i18n-ignore="true" className="space-y-6">
      <PageHeader
        title={text("Professional applications", "Dossiers professionnels")}
        description={text(
          "Review profiles submitted through the professional portal.",
          "Examinez les profils soumis depuis l’espace professionnel.",
        )}
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {text("Refresh", "Actualiser")}
          </button>
        }
      />
      <div className="flex gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {text(
            "Approval confirms that the submitted information has been reviewed by OMSG. It does not certify identity, criminal records, insurance coverage or professional licensing.",
            "L’approbation confirme qu’OMSG a examiné les renseignements soumis. Elle ne certifie ni l’identité, ni les antécédents judiciaires, ni la couverture d’assurance, ni les autorisations professionnelles.",
          )}
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <span className="sr-only">
            {text("Search professional applications", "Rechercher un dossier professionnel")}
          </span>
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={text("Name, email, city or service", "Nom, courriel, ville ou service")}
            className="min-h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">{text("Filter by status", "Filtrer par statut")}</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Status | "all")}
            className="min-h-11 w-full rounded-xl border bg-white px-3 text-sm"
          >
            <option value="all">{text("All applications", "Tous les dossiers")}</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({accounts.filter((a) => a.review_status === value).length})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section
          aria-label={text("Application list", "Liste des dossiers")}
          aria-busy={loading}
          className="space-y-3"
        >
          {loading ? (
            <p role="status" className="rounded-2xl border bg-white p-6 text-sm text-slate-600">
              {text("Loading applications…", "Chargement des dossiers…")}
            </p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800">
                {text("No matching applications", "Aucun dossier correspondant")}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {text(
                  "New submissions will appear here. You can also change the status filter.",
                  "Les nouveaux dossiers apparaîtront ici. Vous pouvez aussi changer le filtre de statut.",
                )}
              </p>
            </div>
          ) : (
            visible.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={selectedId === a.id}
                onClick={() => show(a)}
                className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-teal-400 focus-visible:outline-teal-700 ${selectedId === a.id ? "border-teal-600 ring-1 ring-teal-600" : "border-slate-200"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="break-words font-bold text-slate-950">
                      {a.business_name || a.contact_name || a.email}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-600">{a.email}</p>
                  </div>
                  {badge(a.review_status)}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {[a.city, a.province].filter(Boolean).join(", ")} ·{" "}
                  {formatDate(a.submitted_at || a.created_at)}
                </p>
                <p className="mt-2 truncate text-xs text-slate-500">{a.services.join(" · ")}</p>
              </button>
            ))
          )}
          {accounts.length === 500 && (
            <p className="text-sm text-amber-900">
              {text(
                "Showing the 500 most recently updated accounts.",
                "Affichage des 500 dossiers modifiés le plus récemment.",
              )}
            </p>
          )}
        </section>
        {selected && (
          <section
            aria-label={text("Application details", "Détail du dossier")}
            className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="break-words text-xl font-bold text-slate-950">
                  {selected.business_name || selected.contact_name}
                </h2>
                <div className="mt-2">{badge(selected.review_status)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label={text("Close application", "Fermer le dossier")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              {[
                [text("Contact", "Contact"), selected.contact_name],
                [
                  text("Account type", "Type de compte"),
                  selected.account_type === "company"
                    ? text("Company", "Entreprise")
                    : text("Independent professional", "Professionnel indépendant"),
                ],
                [text("Email", "Courriel"), selected.email],
                [text("Phone", "Téléphone"), selected.phone],
                [
                  text("Location", "Localisation"),
                  [selected.city, selected.province, selected.postal_code]
                    .filter(Boolean)
                    .join(", "),
                ],
                [
                  text("Preferred language", "Langue préférée"),
                  selected.preferred_language === "fr" ? "Français" : "English",
                ],
                [text("Website", "Site web"), selected.website],
                [text("Submitted", "Soumis le"), formatDate(selected.submitted_at)],
                [text("Services", "Services"), selected.services.join(", ")],
                [text("Coverage areas", "Zones desservies"), selected.service_areas.join(", ")],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-slate-900">
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 border-t pt-5">
              <h3 className="font-semibold text-slate-900">
                {text("Supporting documents", "Pièces justificatives")}
              </h3>
              {documentsLoading ? (
                <p role="status" className="mt-2 text-sm text-slate-500">
                  {text("Loading…", "Chargement…")}
                </p>
              ) : documentError ? (
                <div role="alert" className="mt-3 text-sm text-red-800">
                  {documentError}
                  <button
                    type="button"
                    onClick={() => setDocumentReload((r) => r + 1)}
                    className="ml-2 min-h-11 underline"
                  >
                    {text("Retry", "Réessayer")}
                  </button>
                </div>
              ) : documents.length ? (
                <ul className="mt-3 space-y-2">
                  {documents.map((d) => (
                    <li key={d.id}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 items-center justify-between gap-2 rounded-xl border p-3 text-sm font-medium text-teal-800 hover:bg-teal-50"
                      >
                        <span className="break-all">{d.file_name}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span className="sr-only">
                          {text("Opens in a new tab", "S’ouvre dans un nouvel onglet")}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  {text(
                    "No supporting documents were uploaded.",
                    "Aucune pièce justificative téléversée.",
                  )}
                </p>
              )}
            </div>
            {selected.review_message && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
                <h3 className="font-semibold">
                  {text(
                    "Previous message to the professional",
                    "Message précédent au professionnel",
                  )}
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words">{selected.review_message}</p>
              </div>
            )}
            <div className="mt-6 border-t pt-5">
              <label className="block text-sm font-semibold text-slate-800">
                {text(
                  "Message visible to the professional",
                  "Message visible par le professionnel",
                )}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border p-3 font-normal"
                  placeholder={text(
                    "Explain your decision or list the information needed.",
                    "Expliquez votre décision ou précisez les informations nécessaires.",
                  )}
                />
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                  disabled={saving || documentsLoading || Boolean(documentError)}
                  className="mt-1 h-4 w-4 accent-teal-800"
                />
                <span>
                  {text(
                    "I have reviewed the submitted profile and available documents. This decision concerns this application only.",
                    "J’ai examiné le profil soumis et les pièces disponibles. Cette décision porte uniquement sur ce dossier.",
                  )}
                </span>
              </label>
              <div className="mt-5 flex flex-wrap gap-2">
                {selected.review_status === "pending_review" && (
                  <button
                    type="button"
                    onClick={() => void review("approved")}
                    disabled={saving || !reviewed || !message.trim()}
                    className="min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {text("Approve application", "Approuver le dossier")}
                  </button>
                )}
                {selected.review_status !== "draft" &&
                  selected.review_status !== "changes_requested" && (
                    <button
                      type="button"
                      onClick={() => void review("changes_requested")}
                      disabled={saving || !reviewed || !message.trim()}
                      className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-950 disabled:opacity-40"
                    >
                      {text("Request changes", "Demander des compléments")}
                    </button>
                  )}
                {selected.review_status === "approved" && (
                  <button
                    type="button"
                    onClick={() => void review("suspended")}
                    disabled={saving || !reviewed || !message.trim()}
                    className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-800 disabled:opacity-40"
                  >
                    {text("Suspend account", "Suspendre le compte")}
                  </button>
                )}
              </div>
              {selected.review_status === "draft" && (
                <p className="mt-3 text-sm text-slate-500">
                  {text(
                    "This profile has not been submitted for review yet.",
                    "Ce profil n’a pas encore été soumis à l’examen.",
                  )}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
