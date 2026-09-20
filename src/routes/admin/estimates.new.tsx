import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { requireActiveAdmin } from "@/features/admin/requireAdmin";
import { supabase } from "@/lib/supabase";
import { LanguageSwitcher, useLanguage } from "@/lib/language";
import { QuoteQuestionnaire } from "@/components/quote-questionnaire";
import {
  buildEstimateDraft,
  quoteTotals,
  roundMoney,
  type QuoteLine,
  type QuoteRequest,
  type VisitBasis,
} from "@/lib/estimate-request";

const searchSchema = z.object({
  customerId: z.string().uuid().optional().catch(undefined),
  serviceRequestId: z.string().uuid().optional().catch(undefined),
});
export const Route = createFileRoute("/admin/estimates/new")({
  validateSearch: searchSchema,
  component: NewEstimatePage,
});
type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
};
const customerFields = "id,first_name,last_name,email,phone,address_line,city,province,postal_code";
const blankLine = (): QuoteLine => ({ description: "", quantity: 1, unit_price: null });
const message = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Unable to prepare the quote.";

function NewEstimatePage() {
  const { customerId, serviceRequestId } = Route.useSearch();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState(customerId ?? "");
  const [request, setRequest] = useState<QuoteRequest | null>(null);
  const [basis, setBasis] = useState<VisitBasis>("first");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0.13);
  const [defaultTax, setDefaultTax] = useState(0.13);
  const [currency, setCurrency] = useState("CAD");
  const [lines, setLines] = useState<QuoteLine[]>([blankLine()]);
  const [estimatedHours, setEstimatedHours] = useState<number | null>(2);
  const [crewSize, setCrewSize] = useState(1);
  const [serviceType, setServiceType] = useState("one_time");
  const [frequency, setFrequency] = useState("custom");
  const [contractMonths, setContractMonths] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const draft = useMemo(
    () => (request ? buildEstimateDraft(request, basis, defaultTax) : null),
    [request, basis, defaultTax],
  );
  const totals = useMemo(() => quoteTotals(lines, taxRate, discount), [lines, taxRate, discount]);
  const customer = customers.find((row) => row.id === selectedCustomer);
  const money = (n: number) =>
    new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency,
    }).format(n);

  function applyDraft(value: ReturnType<typeof buildEstimateDraft>) {
    setTitle(value.title);
    setNotes(value.notes);
    setLines(value.lines);
    setDiscount(value.discount);
    setTaxRate(value.taxRate);
    setEstimatedHours(value.hours);
    setCrewSize(1);
    setServiceType(value.serviceType);
    setFrequency(value.frequency);
    setContractMonths(null);

    setDirty(false);
    if (value.currency) setCurrency(value.currency);
  }
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReady(false);
    setError("");
    async function load() {
      try {
        if (!(await requireActiveAdmin())) {
          if (!cancelled) await navigate({ to: "/admin/login" });
          return;
        }
        const [customerResult, settingsResult, requestResult] = await Promise.all([
          supabase
            .from("customers")
            .select(customerFields)
            .neq("status", "archived")
            .order("first_name"),
          supabase
            .from("app_settings")
            .select(
              "default_tax_rate,default_currency,default_quote_valid_days,default_quote_terms",
            )
            .eq("id", 1)
            .maybeSingle(),
          serviceRequestId
            ? supabase
                .from("service_requests")
                .select(
                  "id,request_number,customer_id,first_name,last_name,email,phone,address_line,city,province,postal_code,service_name,preferred_date,preferred_time,description,questionnaire_answers",
                )
                .eq("id", serviceRequestId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (customerResult.error) throw customerResult.error;
        if (settingsResult.error) throw settingsResult.error;
        if (requestResult.error) throw requestResult.error;
        if (serviceRequestId && !requestResult.data)
          throw new Error(
            "The original request could not be loaded. Return to the request and try again.",
          );
        const saved = requestResult.data as QuoteRequest | null;
        if (saved?.customer_id && customerId && saved.customer_id !== customerId)
          throw new Error("The selected customer does not match the original request.");
        const list = (customerResult.data ?? []) as Customer[];
        const selected = saved?.customer_id ?? customerId ?? "";
        if (selected && !list.some((row) => row.id === selected)) {
          const linked = await supabase
            .from("customers")
            .select(customerFields)
            .eq("id", selected)
            .maybeSingle();
          if (linked.error) throw linked.error;
          if (!linked.data) throw new Error("The linked customer could not be found.");
          list.push(linked.data as Customer);
        }
        if (cancelled) return;
        const settings = settingsResult.data;
        const rate = Number(settings?.default_tax_rate ?? 0.13);
        const days = Math.max(1, Number(settings?.default_quote_valid_days || 30));
        const date = new Date();
        date.setDate(date.getDate() + days);
        setCustomers(list);
        setSelectedCustomer(selected);
        setRequest(saved);
        setBasis("first");
        setDefaultTax(rate);
        setTaxRate(rate);
        setCurrency(settings?.default_currency || "CAD");
        setValidUntil(date.toISOString().slice(0, 10));
        const initialDraft = saved ? buildEstimateDraft(saved, "first", rate) : null;
        setTerms(
          [
            settings?.default_quote_terms ||
              `This quote is valid for ${days} days. Additional work requires authorization.`,
            initialDraft?.billingCondition,
          ]
            .filter(Boolean)
            .join("\n\n"),
        );
        if (initialDraft) applyDraft(initialDraft);
        else {
          setTitle("");
          setNotes("");
          setLines([blankLine()]);
          setDiscount(0);
          setEstimatedHours(2);
          setCrewSize(1);
          setServiceType("one_time");
          setFrequency("custom");
          setContractMonths(null);

          setDirty(false);
        }
        setReady(true);
      } catch (caught) {
        if (!cancelled) setError(message(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [customerId, serviceRequestId, navigate]);

  function changeBasis(next: VisitBasis) {
    if (!request || next === basis) return;
    if (
      dirty &&
      !window.confirm(
        t(
          "Replace your edits with the saved amounts for the selected visit?",
          "Remplacer vos modifications par les montants enregistrés pour la visite choisie ?",
        ),
      )
    )
      return;
    setBasis(next);
    applyDraft(buildEstimateDraft(request, next, defaultTax));
  }
  function updateLine(index: number, values: Partial<QuoteLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...values } : line)));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current || !ready || loading) return;
    setError("");
    if (!selectedCustomer || (request?.customer_id && request.customer_id !== selectedCustomer)) {
      setError(
        t(
          "Select the customer linked to this request.",
          "Sélectionnez le client associé à cette demande.",
        ),
      );
      return;
    }
    if (
      !lines.length ||
      lines.some(
        (line) =>
          !line.description.trim() ||
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0 ||
          line.unit_price === null ||
          !Number.isFinite(line.unit_price) ||
          line.unit_price < 0,
      )
    ) {
      setError(
        t(
          "Enter a description, quantity and price for every service.",
          "Renseignez la description, la quantité et le prix de chaque service.",
        ),
      );
      return;
    }
    if (
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 1 ||
      !estimatedHours ||
      !Number.isFinite(estimatedHours) ||
      estimatedHours < 0.5 ||
      estimatedHours > 24 ||
      !Number.isInteger(crewSize) ||
      crewSize < 1 ||
      crewSize > 20
    ) {
      setError(
        t(
          "Check the taxes, duration and crew size.",
          "Vérifiez les taxes, la durée et le nombre d’employés.",
        ),
      );
      return;
    }
    if (
      serviceType === "recurring" &&
      contractMonths !== null &&
      (!Number.isInteger(contractMonths) || contractMonths < 1 || contractMonths > 36)
    ) {
      setError(
        t(
          "Enter a contract duration from 1 to 36 months, or leave it blank.",
          "Indiquez une durée de contrat de 1 à 36 mois, ou laissez vide.",
        ),
      );
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > totals.subtotal) {
      setError(
        t(
          "The credit must be between zero and the subtotal.",
          "Le crédit doit être compris entre zéro et le sous-total.",
        ),
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const user = await requireActiveAdmin();
      if (!user) {
        await navigate({ to: "/admin/login" });
        return;
      }
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert({
          customer_id: selectedCustomer,
          title: title.trim() || null,
          status: "draft",
          service_request_id: serviceRequestId || null,
          valid_until: validUntil || null,
          estimated_duration_minutes: Math.round(estimatedHours * 60),
          crew_size: crewSize,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          subtotal: totals.subtotal,
          discount_total: discount,
          tax_rate: taxRate,
          tax_total: totals.tax,
          total: totals.total,
          currency,
          service_type: serviceType,
          recurrence_frequency: serviceType === "recurring" ? frequency : null,
          contract_months: serviceType === "recurring" ? contractMonths : null,
          contract_discount_percent: 0,
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();
      if (estimateError) throw estimateError;
      const { error: itemError } = await supabase.from("estimate_items").insert(
        lines.map((line, index) => ({
          estimate_id: estimate.id,
          position: index + 1,
          description: line.description.trim(),
          quantity: line.quantity,
          unit_price: line.unit_price!,
          line_subtotal: roundMoney(line.quantity * line.unit_price!),
          line_total: roundMoney(line.quantity * line.unit_price!),
        })),
      );
      if (itemError) {
        const rollback = await supabase.from("estimates").delete().eq("id", estimate.id);
        if (rollback.error)
          throw new Error(
            `The service lines could not be saved. Draft ${estimate.id} needs review before retrying.`,
          );
        throw itemError;
      }
      await navigate({ to: "/admin/estimates/$estimateId", params: { estimateId: estimate.id } });
    } catch (caught) {
      setError(message(caught));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const input = "mt-1 w-full rounded-lg border px-3 py-2";
  const section = "rounded-xl border bg-white p-5 shadow-sm";
  const address = (row: QuoteRequest | Customer) =>
    [row.address_line, row.city, row.province, row.postal_code].filter(Boolean).join(", ");
  return (
    <div data-i18n-ignore="true" className="space-y-6">
      <header>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin/estimates"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            ← {t("Back to quotes", "Retour aux devis")}
          </Link>
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{t("Create Quote", "Créer un devis officiel")}</h1>
        <p className="text-slate-600">
          {t(
            "Review and save a draft. Sending it is a separate step.",
            "Vérifiez et enregistrez un brouillon. L’envoi au client se fait ensuite.",
          )}
        </p>
      </header>
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}
      {loading ? (
        <p>{t("Loading the request and customer…", "Chargement de la demande et du client…")}</p>
      ) : !ready ? (
        <p>
          {t(
            "Return to the original request to retry. No quote has been created.",
            "Retournez à la demande initiale pour réessayer. Aucun devis n’a été créé.",
          )}
        </p>
      ) : (
        <>
          {request && (
            <section className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-teal-950">
                  {t("Imported from request", "Repris depuis la demande")} #
                  {request.request_number ?? request.id}
                </h2>
                <Link
                  to="/admin/quotes/$requestId"
                  params={{ requestId: request.id }}
                  className="text-sm font-semibold text-teal-800 underline"
                >
                  {t("Open original request", "Ouvrir la demande initiale")}
                </Link>
              </div>
              <p className="mt-2 text-sm">
                {t(
                  "Saved prices are copied as submitted. You can adjust them before saving the official quote.",
                  "Les prix enregistrés sont repris tels qu’ils ont été soumis. Vous pouvez les ajuster avant d’enregistrer le devis officiel.",
                )}
              </p>
              {draft?.recurring && (
                <label className="mt-4 block max-w-md text-sm font-semibold">
                  {t("Visit covered by this quote", "Visite couverte par ce devis")}
                  <select
                    aria-label={t("Visit covered by this quote", "Visite couverte par ce devis")}
                    value={basis}
                    onChange={(e) => changeBasis(e.target.value as VisitBasis)}
                    className={input}
                  >
                    <option value="first">{t("First visit", "Première visite")}</option>
                    {draft.fourVisitPolicy && (
                      <>
                        <option value="qualifying">
                          {t("Visit 2 or 3 — full rate", "Visite 2 ou 3 — tarif complet")}
                        </option>
                        <option value="fourth">
                          {t("Visit 4 — accumulated credit", "Visite 4 — crédit cumulé")}
                        </option>
                      </>
                    )}
                    <option value="recurring">
                      {draft.fourVisitPolicy
                        ? t(
                            "Visit 5 onward — eligible recurring rate",
                            "Dès la visite 5 — tarif récurrent admissible",
                          )
                        : t(
                            "Following visit (price per visit)",
                            "Visite suivante (prix par visite)",
                          )}
                    </option>
                  </select>
                </label>
              )}
              {draft?.warnings.map((warning) => (
                <p key={warning} className="mt-3 text-sm font-medium text-amber-900">
                  {warning}
                </p>
              ))}
            </section>
          )}
          <form
            onSubmit={submit}
            onChange={() => {
              setDirty(true);
            }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <fieldset disabled={saving} className="min-w-0 space-y-6">
              <section className={section}>
                <h2 className="text-lg font-bold">
                  {t("Customer and terms", "Client et conditions")}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    {t("Customer", "Client")} *
                    <select
                      required
                      aria-label={t("Customer", "Client")}
                      disabled={!!request?.customer_id}
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className={input}
                    >
                      <option value="">{t("Choose a customer", "Choisissez un client")}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name ?? ""} — {c.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    {t("Valid until", "Valide jusqu’au")}
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className={input}
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    {t("Quote title", "Titre du devis")}
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={input}
                    />
                  </label>
                </div>
                {(request || customer) && (
                  <div className="mt-4 whitespace-pre-line break-words rounded-lg bg-slate-50 p-4 text-sm">
                    <p className="font-semibold">
                      {request
                        ? t(
                            "Contact and service address from the request",
                            "Contact et adresse d’intervention de la demande",
                          )
                        : t("Customer details", "Coordonnées du client")}
                    </p>
                    <p className="mt-2">
                      {[
                        request?.first_name ?? customer?.first_name,
                        request?.last_name ?? customer?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    <p>
                      {[request?.email ?? customer?.email, request?.phone ?? customer?.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p>{address(request ?? customer!)}</p>
                  </div>
                )}
              </section>
              <section className={section}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{t("Services", "Prestations")}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setLines([...lines, blankLine()]);

                      setDirty(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    {t("Add", "Ajouter")}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_90px_120px_36px]"
                    >
                      <label className="min-w-0 text-xs font-medium">
                        {t("Description", "Description")}
                        <textarea
                          aria-label={`Description ${index + 1}`}
                          rows={3}
                          required
                          value={line.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                          className={input}
                        />
                      </label>
                      <label className="text-xs font-medium">
                        {t("Quantity", "Quantité")}
                        <input
                          aria-label={`Quantity ${index + 1}`}
                          type="number"
                          min=".01"
                          step=".01"
                          required
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                          className={input}
                        />
                      </label>
                      <label className="text-xs font-medium">
                        {t("Unit price", "Prix unitaire")} ({currency})
                        <input
                          aria-label={`Unit price ${index + 1}`}
                          type="number"
                          min="0"
                          step=".01"
                          required
                          value={line.unit_price ?? ""}
                          onChange={(e) =>
                            updateLine(index, {
                              unit_price: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          className={input}
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Delete line ${index + 1}`}
                        disabled={lines.length === 1}
                        onClick={() => {
                          setLines(lines.filter((_, i) => i !== index));

                          setDirty(true);
                        }}
                        className="self-start rounded-lg border p-2 text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section className={section}>
                <h2 className="text-lg font-bold">
                  {t("Duration and service schedule", "Durée et fréquence")}
                </h2>
                {draft?.hours && (
                  <p className="mt-2 text-sm text-slate-600">
                    {t(
                      `The request estimated ${draft.hours} base worker-hours. Confirm the on-site duration, crew and extra-service time.`,
                      `La demande estime ${draft.hours} heures-personnes de base. Confirmez la durée sur place, l’équipe et le temps des suppléments.`,
                    )}
                  </p>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    {t("On-site duration (hours)", "Durée sur place (heures)")} *
                    <input
                      type="number"
                      min=".5"
                      max="24"
                      step=".25"
                      required
                      value={estimatedHours ?? ""}
                      onChange={(e) => {
                        setEstimatedHours(e.target.value === "" ? null : Number(e.target.value));
                      }}
                      className={input}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    {t("Crew size", "Nombre d’employés")} *
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      required
                      value={crewSize}
                      onChange={(e) => {
                        setCrewSize(Number(e.target.value));
                      }}
                      className={input}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    {t("Service type", "Type de prestation")}
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className={input}
                    >
                      <option value="one_time">{t("Single visit", "Visite unique")}</option>
                      <option value="recurring">
                        {t("Recurring service", "Service récurrent")}
                      </option>
                    </select>
                  </label>
                  {serviceType === "recurring" && (
                    <>
                      <label className="text-sm font-medium">
                        {t("Frequency", "Fréquence")}
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          className={input}
                        >
                          <option value="weekly">{t("Weekly", "Chaque semaine")}</option>
                          <option value="biweekly">
                            {t("Every two weeks", "Toutes les deux semaines")}
                          </option>
                          <option value="monthly">{t("Monthly", "Chaque mois")}</option>
                          <option value="custom">{t("Custom", "Personnalisée")}</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        {t("Contract months (optional)", "Durée du contrat en mois (facultatif)")}
                        <input
                          type="number"
                          min="1"
                          max="36"
                          step="1"
                          value={contractMonths ?? ""}
                          onChange={(e) =>
                            setContractMonths(e.target.value === "" ? null : Number(e.target.value))
                          }
                          className={input}
                        />
                      </label>
                    </>
                  )}
                </div>
              </section>
              <section className={section}>
                <h2 className="text-lg font-bold">{t("Notes and terms", "Notes et conditions")}</h2>
                <label className="mt-4 block text-sm font-medium">
                  {t("Notes visible to the customer", "Notes visibles par le client")}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={9}
                    className={input}
                  />
                </label>
                <label className="mt-4 block text-sm font-medium">
                  {t("Terms", "Conditions")}
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={4}
                    className={input}
                  />
                </label>
              </section>
            </fieldset>
            <aside className="min-w-0">
              <section className={`${section} sticky top-6`}>
                <h2 className="text-lg font-bold">{t("Summary", "Récapitulatif")}</h2>
                <label className="mt-4 block text-sm font-medium">
                  {t("Tax rate (%)", "Taux de taxes (%)")}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step=".001"
                    value={Number((taxRate * 100).toFixed(4))}
                    onChange={(e) => {
                      setTaxRate(Number(e.target.value) / 100);
                    }}
                    className={input}
                  />
                </label>
                {(discount > 0 || draft?.fourVisitPolicy) && (
                  <label className="mt-4 block text-sm font-medium">
                    {t("Credit before tax (CAD)", "Crédit avant taxes (CAD)")}
                    <input
                      type="number"
                      min="0"
                      max={totals.subtotal}
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className={input}
                    />
                  </label>
                )}
                {basis === "fourth" && (
                  <p className="mt-3 text-sm text-teal-900">
                    {t(
                      "The credit is conditional on four consecutive completed visits at the agreed frequency. Verify eligibility before issuing invoice 4.",
                      "Le crédit est soumis à quatre visites consécutives réalisées à la fréquence convenue. Vérifiez l’admissibilité avant d’émettre la facture 4.",
                    )}
                  </p>
                )}
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label={t("Subtotal", "Sous-total")} value={money(totals.subtotal)} />
                  {discount > 0 && (
                    <Row
                      label={t("Accumulated credit", "Crédit cumulé")}
                      value={`−${money(discount)}`}
                    />
                  )}
                  {totals.taxes.map((row) => (
                    <Row key={row.label} label={row.label} value={money(row.amount)} />
                  ))}
                  <div className="border-t pt-3">
                    <Row label="Total" value={money(totals.total)} strong />
                  </div>
                </dl>
                {lines.some((line) => line.unit_price === null) && (
                  <p className="mt-4 text-sm text-amber-800">
                    {t(
                      "Total incomplete: enter all service prices.",
                      "Total incomplet : renseignez tous les prix.",
                    )}
                  </p>
                )}
                <button
                  disabled={saving}
                  className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? t("Saving…", "Enregistrement…")
                    : t("Save Draft", "Enregistrer le brouillon")}
                </button>
              </section>
            </aside>
          </form>
          {request && (
            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer font-semibold">
                {t("Original request details", "Détail de la demande initiale")}
              </summary>
              <div className="mt-4">
                <QuoteQuestionnaire answers={request.questionnaire_answers ?? null} />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-lg font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  );
}
