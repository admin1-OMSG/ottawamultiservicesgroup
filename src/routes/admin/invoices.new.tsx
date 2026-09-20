import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { requireActiveAdmin } from "@/features/admin/requireAdmin";
import { supabase } from "@/lib/supabase";
import { quoteTotals, roundMoney, type QuoteLine } from "@/lib/estimate-request";
import { useLanguage } from "@/lib/language";
const schema = z.object({ estimateId: z.string().uuid().optional().catch(undefined) });
export const Route = createFileRoute("/admin/invoices/new")({
  validateSearch: schema,
  component: NewInvoice,
});
type Customer = { id: string; first_name: string; last_name: string | null; email: string };
const emptyLine = (): QuoteLine => ({ description: "", quantity: 1, unit_price: null });

function NewInvoice() {
  const { estimateId } = Route.useSearch();
  const nav = useNavigate();
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const money = (amount: number) =>
    new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency,
    }).format(amount);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [taxRate, setTaxRate] = useState(0.13);
  const [currency, setCurrency] = useState("CAD");
  const [discount, setDiscount] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoading(true);
    setError("");
    async function init() {
      try {
        if (!(await requireActiveAdmin())) {
          if (!cancelled) await nav({ to: "/admin/login" });
          return;
        }
        const { data, error } = await supabase
          .from("customers")
          .select("id,first_name,last_name,email")
          .neq("status", "archived")
          .order("first_name");
        if (error) throw error;
        let rows = (data ?? []) as Customer[];
        if (estimateId) {
          const [e, i] = await Promise.all([
            supabase
              .from("estimates")
              .select("customer_id,title,notes,terms,discount_total,tax_rate,currency")
              .eq("id", estimateId)
              .single(),
            supabase
              .from("estimate_items")
              .select("description,quantity,unit_price")
              .eq("estimate_id", estimateId)
              .order("position"),
          ]);
          if (e.error) throw e.error;
          if (i.error) throw i.error;
          if (!i.data?.length)
            throw new Error(
              t(
                "The quote has no service lines. Complete the quote before creating an invoice.",
                "Le devis ne contient aucune prestation. Complétez-le avant de créer une facture.",
              ),
            );
          if (!rows.some((c) => c.id === e.data.customer_id)) {
            const linked = await supabase
              .from("customers")
              .select("id,first_name,last_name,email")
              .eq("id", e.data.customer_id)
              .single();
            if (linked.error) throw linked.error;
            rows = [...rows, linked.data];
          }
          if (cancelled) return;
          setCustomerId(e.data.customer_id);
          setTitle(e.data.title ?? "");
          setLines(i.data as QuoteLine[]);
          setNotes(e.data.notes ?? "");
          setTerms(e.data.terms ?? "");
          setDiscount(Number(e.data.discount_total ?? 0));
          setTaxRate(Number(e.data.tax_rate ?? 0.13));
          setCurrency(e.data.currency || "CAD");
        } else {
          if (cancelled) return;
          setCustomerId("");
          setTitle("");
          setLines([emptyLine()]);
          setNotes("");
          setTerms("");
          setDiscount(0);
          setTaxRate(0.13);
          setCurrency("CAD");
        }
        if (!cancelled) {
          setCustomers(rows);
          setReady(true);
        }
      } catch (caught) {
        if (!cancelled)
          setError(
            caught && typeof caught === "object" && "message" in caught
              ? String(caught.message)
              : t("Unable to initialize", "Impossible de préparer la facture"),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [estimateId, nav]);
  const totals = useMemo(() => quoteTotals(lines, taxRate, discount), [lines, taxRate, discount]);
  function update(index: number, patch: Partial<QuoteLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }
  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!ready || savingRef.current) return;
    setError("");
    if (
      !customerId ||
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
        t("Check the customer and service lines.", "Vérifiez le client et les prestations."),
      );
      return;
    }
    if (
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount > totals.subtotal ||
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 1
    ) {
      setError(t("Check the credit and tax rate.", "Vérifiez le crédit et le taux de taxes."));
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const user = await requireActiveAdmin();
      if (!user) {
        await nav({ to: "/admin/login" });
        return;
      }
      let linkedJobId: string | null = null;
      if (estimateId) {
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .select("id")
          .eq("estimate_id", estimateId)
          .maybeSingle();
        if (jobError) throw jobError;
        linkedJobId = job?.id ?? null;
      }
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          customer_id: customerId,
          estimate_id: estimateId ?? null,
          job_id: linkedJobId,
          title: title || null,
          status: "draft",
          due_date: dueDate || null,
          subtotal: totals.subtotal,
          discount_total: discount,
          tax_rate: taxRate,
          tax_total: totals.tax,
          total: totals.total,
          amount_paid: 0,
          balance_due: totals.total,
          currency,
          notes: notes || null,
          terms: terms || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemError } = await supabase
        .from("invoice_items")
        .insert(
          lines.map((line, index) => ({
            invoice_id: data.id,
            position: index + 1,
            description: line.description.trim(),
            quantity: line.quantity,
            unit_price: line.unit_price!,
            line_total: roundMoney(line.quantity * line.unit_price!),
          })),
        );
      if (itemError) {
        const rollback = await supabase.from("invoices").delete().eq("id", data.id);
        if (rollback.error)
          throw new Error(`Invoice ${data.id} needs review: its service lines could not be saved.`);
        throw itemError;
      }
      await nav({ to: "/admin/invoices/$invoiceId", params: { invoiceId: data.id } });
    } catch (caught) {
      setError(
        caught && typeof caught === "object" && "message" in caught
          ? String(caught.message)
          : t("Unable to create the invoice.", "Impossible de créer la facture."),
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const input = "mt-1 w-full rounded-lg border px-3 py-2";
  return (
    <div data-i18n-ignore="true" className="space-y-6">
      <header>
        <Link to="/admin/invoices" className="text-sm font-semibold text-blue-700">
          ← {t("Back", "Retour")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t("New Invoice", "Nouvelle facture")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t(
            "Review the services, any credit and the billing conditions before saving the draft.",
            "Vérifiez les prestations, le crédit éventuel et les conditions de facturation avant d’enregistrer le brouillon.",
          )}
        </p>
      </header>
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}
      {loading ? (
        <p>{t("Loading…", "Chargement…")}</p>
      ) : (
        ready && (
          <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <fieldset disabled={saving} className="min-w-0 space-y-6">
              <section className="rounded-xl border bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    {t("Customer", "Client")} *
                    <select
                      aria-label={t("Customer", "Client")}
                      required
                      disabled={!!estimateId}
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className={input}
                    >
                      <option value="">{t("Choose", "Choisir")}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name ?? ""} — {c.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    {t("Due date", "Échéance")}
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={input}
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    {t("Title", "Titre")}
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={input}
                    />
                  </label>
                </div>
              </section>
              <section className="rounded-xl border bg-white p-5">
                <div className="flex justify-between">
                  <h2 className="font-bold">{t("Invoice items", "Prestations facturées")}</h2>
                  <button
                    type="button"
                    onClick={() => setLines([...lines, emptyLine()])}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("Add", "Ajouter")}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px_130px_42px]"
                    >
                      <textarea
                        aria-label={`Description ${i + 1}`}
                        required
                        value={line.description}
                        onChange={(e) => update(i, { description: e.target.value })}
                        placeholder="Description"
                        className={input}
                      />
                      <input
                        aria-label={`Quantity ${i + 1}`}
                        required
                        type="number"
                        min=".01"
                        step=".01"
                        value={line.quantity}
                        onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                        className={input}
                      />
                      <input
                        aria-label={`Unit price ${i + 1}`}
                        required
                        type="number"
                        min="0"
                        step=".01"
                        value={line.unit_price ?? ""}
                        onChange={(e) =>
                          update(i, {
                            unit_price: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className={input}
                      />
                      <button
                        type="button"
                        aria-label={`Delete line ${i + 1}`}
                        disabled={lines.length === 1}
                        onClick={() => setLines(lines.filter((_, n) => n !== i))}
                        className="self-start rounded-lg border p-2 text-red-600"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="mt-4 block text-sm font-medium">
                  Notes
                  <textarea
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={input}
                  />
                </label>
                <label className="mt-4 block text-sm font-medium">
                  {t("Terms", "Conditions")}
                  <textarea
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className={input}
                  />
                </label>
              </section>
            </fieldset>
            <aside>
              <section className="sticky top-6 rounded-xl border bg-white p-5">
                <h2 className="font-bold">{t("Summary", "Récapitulatif")}</h2>
                <label className="mt-4 block text-sm font-medium">
                  {t("Credit before tax", "Crédit avant taxes")} ({currency})
                  <input
                    type="number"
                    min="0"
                    max={totals.subtotal}
                    step=".01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className={input}
                  />
                </label>
                {discount > 0 && (
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    {t(
                      "For a four-visit recurring credit, confirm completion of the four consecutive visits and check that this credit has not already been issued. Invoice count alone does not establish eligibility.",
                      "Pour un crédit de récurrence, confirmez la réalisation des quatre visites consécutives et vérifiez que ce crédit n’a pas déjà été émis. Le nombre de factures ne suffit pas à établir l’admissibilité.",
                    )}
                  </p>
                )}
                <p className="mt-4 flex justify-between">
                  <span>{t("Subtotal", "Sous-total")}</span>
                  <b>{money(totals.subtotal)}</b>
                </p>
                {discount > 0 && (
                  <p className="mt-2 flex justify-between text-teal-800">
                    <span>{t("Credit", "Crédit")}</span>
                    <b>−{money(discount)}</b>
                  </p>
                )}
                {totals.taxes.map((tax) => (
                  <p key={tax.label} className="mt-2 flex justify-between gap-3 text-sm">
                    <span>{tax.label}</span>
                    <b>{money(tax.amount)}</b>
                  </p>
                ))}
                <p className="mt-3 flex justify-between border-t pt-3 text-lg">
                  <span>Total</span>
                  <b>{money(totals.total)}</b>
                </p>
                <button
                  disabled={saving}
                  className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? t("Creating…", "Enregistrement…")
                    : t("Create Invoice", "Créer la facture")}
                </button>
              </section>
            </aside>
          </form>
        )
      )}
    </div>
  );
}
