import { openScopeSection } from "@/components/quote-service-scope";
import type { ServiceScope } from "../../supabase/functions/_shared/quote-service-scope";
import { useLanguage } from "@/lib/language";
import {
  billingCondition,
  billingMoney,
  billingRows,
  type BillingSchedule,
} from "../../supabase/functions/_shared/quote-billing-summary";

export function QuoteBillingSummary({
  schedule,
  quoteId,
  scope,
}: {
  schedule: BillingSchedule;
  quoteId?: string;
  scope?: ServiceScope | null;
}) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const rows = billingRows(schedule, language);
  return (
    <section
      data-i18n-ignore="true"
      aria-label={t("Billing by visit", "Facturation par visite")}
      className="mt-5 overflow-hidden rounded-xl border border-teal-200 bg-white"
    >
      <div className="border-b border-teal-100 bg-teal-50/70 px-4 py-4 sm:px-5">
        <h3 className="text-lg font-bold text-slate-950">
          {t("Your price, visit by visit", "Votre facturation, visite par visite")}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            "Expected amounts in CAD, including tax. Each amount is for one visit.",
            "Montants prévus en CAD, taxes comprises. Chaque montant correspond à une visite.",
          )}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th scope="col">{t("Visit", "Visite")}</th>
            <th scope="col">{t("Amount including tax", "Montant taxes comprises")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className={row.id === "4" ? "bg-teal-50" : ""}>
              <th scope="row" className="px-4 py-3 text-left font-normal sm:px-5">
                <span className="block font-semibold text-slate-900">{row.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{row.note}</span>
                {quoteId &&
                  scope?.sections.some(
                    (section) => section.id === `visit-${row.id.replace(/\D/g, "")}`,
                  ) && (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-teal-800 underline underline-offset-2"
                      onClick={() =>
                        openScopeSection(quoteId, `visit-${row.id.replace(/\D/g, "")}`)
                      }
                    >
                      {t("View services", "Voir les prestations")}
                    </button>
                  )}
              </th>
              <td
                className={`whitespace-nowrap px-4 py-3 text-right text-lg font-bold tabular-nums sm:px-5 ${row.id === "4" ? "text-teal-700" : "text-slate-900"}`}
              >
                {billingMoney(row.value.total, language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-teal-100 px-4 py-4 sm:px-5">
        <p className="text-sm font-semibold text-teal-800">
          {t("Credit on invoice 4, before tax", "Crédit sur la 4e facture, avant taxes")} :{" "}
          {billingMoney(schedule.credit, language)}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{billingCondition(language)}</p>
      </div>
    </section>
  );
}

export function QuoteBillingCalculation({ schedule }: { schedule: BillingSchedule }) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const money = (n: number) => billingMoney(n, language);
  return (
    <section className="mt-5 rounded-lg bg-teal-50 p-4">
      <h4 className="font-semibold text-teal-900">
        {t("How the fourth visit is calculated", "Comment la quatrième visite est calculée")}
      </h4>
      <p className="mt-2 text-sm leading-6">
        {t("Accumulated credit before tax", "Crédit cumulé avant taxes")} :<br />
        <strong>
          3 × ({money(schedule.qualifying.beforeTax)} − {money(schedule.recurring.beforeTax)}) ={" "}
          {money(schedule.credit)}
        </strong>
      </p>
      <p className="mt-2 text-sm leading-6">
        {t("Fourth visit before tax", "Quatrième visite avant taxes")} :<br />
        <strong>
          {money(schedule.recurring.beforeTax)} − {money(schedule.credit)} ={" "}
          {money(schedule.fourth.beforeTax)}
        </strong>
      </p>
      <p className="mt-2 text-sm leading-6">
        {t("Tax on the reduced amount", "Taxes sur le montant réduit")} :{" "}
        {money(schedule.fourth.tax)}
        <br />
        <strong>
          {t("Fourth visit including tax", "Quatrième visite taxes comprises")} :{" "}
          {money(schedule.fourth.total)}
        </strong>
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        {t(
          "The comparison uses the same routine cleaning and recurring extras. First-visit-only extras are excluded from the credit. The taxes below follow the province shown in the quote.",
          "La comparaison porte sur le même entretien courant et les mêmes options récurrentes. Les suppléments de première visite sont exclus du crédit. Les taxes ci-dessous correspondent à la province du devis.",
        )}
      </p>
      <div
        className="mt-4 overflow-x-auto rounded-lg border bg-white"
        tabIndex={0}
        role="region"
        aria-label={t("Tax breakdown by visit", "Ventilation des taxes par visite")}
      >
        <table className="w-full min-w-[450px] text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th scope="col" className="p-3">
                {t("Visit", "Visite")}
              </th>
              <th scope="col" className="p-3 text-right">
                {t("Before tax¹", "Avant taxes¹")}
              </th>
              <th scope="col" className="p-3 text-right">
                Taxes
              </th>
              <th scope="col" className="p-3 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {billingRows(schedule, language).map((row) => (
              <tr key={row.id} className={row.id === "4" ? "bg-teal-50" : "border-t"}>
                <th scope="row" className="p-3 text-left font-medium">
                  {row.label}
                </th>
                <td className="whitespace-nowrap p-3 text-right">{money(row.value.beforeTax)}</td>
                <td className="whitespace-nowrap p-3 text-right">{money(row.value.tax)}</td>
                <td className="whitespace-nowrap p-3 text-right font-semibold">
                  {money(row.value.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {t(
          "¹ After the applicable credit. Amounts are per visit; they are not added to this quote's total.",
          "¹ Après le crédit applicable. Montants par visite ; ils ne s’ajoutent pas au total de ce devis.",
        )}
      </p>
    </section>
  );
}
