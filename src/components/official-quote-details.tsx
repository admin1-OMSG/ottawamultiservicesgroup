import { QuoteServiceScope } from "@/components/quote-service-scope";
import {
  readServiceScope,
  termsWithoutScope,
} from "../../supabase/functions/_shared/quote-service-scope";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { quoteTaxLabel } from "@/lib/estimate-request";
import { readBillingSchedule } from "../../supabase/functions/_shared/quote-billing-summary";
import { QuoteBillingSummary, QuoteBillingCalculation } from "@/components/quote-billing-summary";

export type OfficialQuote = {
  id: string;
  title?: string | null;
  subtotal: number;
  discount_total: number;
  tax_rate: number;
  tax_total: number;
  total: number;
  notes: string | null;
  terms: string | null;
  currency: string;
};
type Item = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

// Query only the signed-in customer's authorized quote items; Supabase RLS remains in force.
export function OfficialQuoteDetails({ estimate }: { estimate: OfficialQuote }) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const schedule = readBillingSchedule(estimate);
  const scope = readServiceScope(estimate.terms);
  const otherTerms = termsWithoutScope(estimate.terms);
  const money = (n: number) =>
    new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: estimate.currency || "CAD",
    }).format(n);
  async function loadItems() {
    if (loading || items) return;
    setLoading(true);
    setError("");
    try {
      const result = await supabase
        .from("estimate_items")
        .select("id,description,quantity,unit_price,line_total")
        .eq("estimate_id", estimate.id)
        .order("position");
      if (result.error) throw result.error;
      setItems(result.data ?? []);
    } catch {
      setError(
        t(
          "Unable to load service details. Please try again before signing.",
          "Impossible de charger les prestations. Réessayez avant de signer.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <QuoteServiceScope terms={estimate.terms} quoteId={estimate.id} />
      {schedule && <QuoteBillingSummary schedule={schedule} quoteId={estimate.id} scope={scope} />}
      <details
        id={`quote-calculation-${estimate.id}`}
        data-i18n-ignore="true"
        className="mt-4 rounded-lg border p-4"
        onToggle={(e) => {
          if (e.currentTarget.open) void loadItems();
        }}
      >
        <summary className="cursor-pointer font-semibold text-blue-800">
          {t("View calculation details", "Voir le détail du calcul")}
        </summary>
        {schedule && <QuoteBillingCalculation schedule={schedule} />}
        <h4 className="mt-5 font-semibold">
          {t(
            "Services for the visit covered by this quote",
            "Prestations de la visite couverte par ce devis",
          )}
        </h4>
        {loading && <p className="mt-4 text-sm">{t("Loading…", "Chargement…")}</p>}
        {error && (
          <div role="alert" className="mt-4 text-sm text-red-700">
            <p>{error}</p>
            <button onClick={() => void loadItems()} className="mt-2 underline">
              {t("Try again", "Réessayer")}
            </button>
          </div>
        )}
        {items && (
          <>
            <ul className="mt-4 divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line break-words font-medium">
                      {item.description}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {item.quantity} × {money(item.unit_price)}
                    </p>
                  </div>
                  <strong>{money(item.line_total)}</strong>
                </li>
              ))}
            </ul>
            {!items.length && (
              <p className="mt-4 text-sm text-amber-800">
                {t(
                  "No service lines have been added. Contact OMSG for the service details before signing.",
                  "Aucune prestation détaillée. Contactez OMSG pour obtenir le détail avant de signer.",
                )}
              </p>
            )}
          </>
        )}
        <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt>{t("Subtotal", "Sous-total")}</dt>
            <dd>{money(estimate.subtotal)}</dd>
          </div>
          {Number(estimate.discount_total) > 0 && (
            <div className="flex justify-between gap-3">
              <dt>{t("Discount", "Remise")}</dt>
              <dd>−{money(estimate.discount_total)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt>{quoteTaxLabel(Number(estimate.tax_rate))}</dt>
            <dd>{money(estimate.tax_total)}</dd>
          </div>
          <div className="flex justify-between gap-3 font-bold">
            <dt>Total</dt>
            <dd>{money(estimate.total)}</dd>
          </div>
        </dl>
      </details>
      <details data-i18n-ignore="true" className="mt-4 rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold text-slate-800">
          {t("Notes and conditions of this quote", "Notes et conditions de ce devis")}
        </summary>
        {estimate.notes && (
          <details className="mt-5 rounded-lg border p-3">
            <summary className="cursor-pointer font-semibold">
              {t("Service details and notes", "Détails de la prestation et notes")}
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {estimate.notes}
            </p>
          </details>
        )}
        {otherTerms && (
          <div className="mt-5">
            <h4 className="font-semibold">{t("Terms", "Conditions")}</h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {otherTerms}
            </p>
          </div>
        )}
      </details>
    </>
  );
}
