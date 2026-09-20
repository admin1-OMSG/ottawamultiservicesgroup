// Presentation only: read the schedule saved with the quote, never today's price list.
// V8 stores this five-line block in notes. Both the portal and email use this reader.
export type BillingLocale = "en" | "fr";
export type BillingQuote = {
  title?: string | null;
  notes?: string | null;
  terms?: string | null;
  currency?: string | null;
  subtotal: number | string;
  discount_total: number | string;
  tax_rate: number | string;
  tax_total: number | string;
  total: number | string;
};
export type BillingVisit = "first" | "qualifying" | "fourth" | "recurring";
export type BillingAmount = { beforeTax: number; tax: number; total: number };
export type BillingSchedule = {
  first: BillingAmount;
  qualifying: BillingAmount;
  fourth: BillingAmount;
  recurring: BillingAmount;
  credit: number;
  savingPerVisit: number;
  active: BillingVisit;
};
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const cents = (n: number) => Math.round(n * 100);
const equal = (a: number, b: number) => cents(a) === cents(b);
const amount = (n: unknown) => {
  if (n === null || n === undefined || String(n).trim() === "") return null;
  const value = Number(n);
  return Number.isFinite(value) && value >= 0 && value <= 10000000 ? value : null;
};
function savedMoney(value: string): number | null {
  const cleaned = value.replace(/CAD|CA\$|\$|\s/gi, "");
  const normalized = cleaned.includes(".") ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? amount(normalized) : null;
}
function taxFor(net: number, rate: number) {
  return Math.abs(rate - 0.14975) < 0.000001
    ? round(round(net * 0.05) + round(net * 0.09975))
    : round(net * rate);
}
// Recover an exact cent amount from the saved tax-inclusive total. Never approximate it.
function breakdown(total: number, rate: number): BillingAmount | null {
  const middle = Math.round((total / (1 + rate)) * 100);
  for (let netCents = Math.max(0, middle - 3); netCents <= middle + 3; netCents++) {
    const beforeTax = netCents / 100;
    const tax = taxFor(beforeTax, rate);
    if (equal(round(beforeTax + tax), total)) return { beforeTax, tax, total };
  }
  return null;
}
export function hasFourVisitCondition(quote: BillingQuote): boolean {
  return /4 consecutive completed visits|4 visites consécutives réalisées/.test(
    `${quote.terms || ""}\n${quote.notes || ""}`,
  );
}
export function quoteVisit(title: string | null | undefined): BillingVisit | null {
  const value = title?.trim() || "";
  if (
    /— (?:Visit 4 — after qualification credit|Visite 4 — après crédit de récurrence)$/.test(value)
  )
    return "fourth";
  if (/— (?:Visit 2 or 3 — full rate|Visite 2 ou 3 — tarif complet)$/.test(value))
    return "qualifying";
  if (/— (?:Visit 5 onward — per visit|Dès la visite 5 — par visite)$/.test(value))
    return "recurring";
  if (/— (?:First visit|Première visite)$/.test(value)) return "first";
  return null;
}
export function readBillingSchedule(quote: BillingQuote): BillingSchedule | null {
  if (!hasFourVisitCondition(quote) || (quote.currency && quote.currency !== "CAD")) return null;
  const active = quoteVisit(quote.title);
  const rate = amount(quote.tax_rate);
  if (!active || rate === null || rate > 1) return null;
  const pattern =
    /^(?:Visit 1, full rate|Visite 1, tarif complet): ([^\n]+)\n(?:Visits 2 and 3, full rate, each|Visites 2 et 3, tarif complet, chacune): ([^\n]+)\n(?:Visit 4 after credit|Visite 4 après crédit): ([^\n]+)\n(?:Accumulated credit before tax|Crédit cumulé avant taxes): ([^\n]+)\n(?:Visit 5 onward, each|À partir de la visite 5, chacune): ([^\n]+)$/gm;
  const matches = [...(quote.notes || "").replace(/\r\n/g, "\n").matchAll(pattern)];
  if (matches.length !== 1) return null;
  const values = matches[0].slice(1).map(savedMoney);
  if (values.some((v) => v === null)) return null;
  const [one, two, four, credit, subsequent] = values as number[];
  const first = breakdown(one, rate),
    qualifying = breakdown(two, rate),
    fourth = breakdown(four, rate),
    recurring = breakdown(subsequent, rate);
  if (!first || !qualifying || !fourth || !recurring) return null;
  const savingPerVisit = round(qualifying.beforeTax - recurring.beforeTax);
  if (
    savingPerVisit < 0 ||
    first.beforeTax < qualifying.beforeTax ||
    !equal(credit, round(3 * savingPerVisit)) ||
    !equal(fourth.beforeTax, round(recurring.beforeTax - credit))
  )
    return null;
  const schedule = { first, qualifying, fourth, recurring, credit, savingPerVisit, active };
  const selected = schedule[active];
  const official = [quote.subtotal, quote.discount_total, quote.tax_total, quote.total].map(amount);
  if (official.some((v) => v === null)) return null;
  const [subtotal, discount, tax, total] = official as number[];
  const expectedDiscount = active === "fourth" ? credit : 0;
  // An edited official price must not expose an obsolete provisional schedule as its billing plan.
  if (
    !equal(discount, expectedDiscount) ||
    !equal(subtotal, round(selected.beforeTax + expectedDiscount)) ||
    !equal(tax, selected.tax) ||
    !equal(total, selected.total)
  )
    return null;
  return schedule;
}
export function billingMoney(n: number, language: BillingLocale) {
  return new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(n);
}
export function billingRows(schedule: BillingSchedule, language: BillingLocale) {
  const fr = language === "fr";
  return [
    {
      id: "1",
      label: fr ? "Visite 1" : "Visit 1",
      note: fr ? "Tarif complet" : "Full rate",
      value: schedule.first,
    },
    {
      id: "2",
      label: fr ? "Visite 2" : "Visit 2",
      note: fr ? "Tarif complet" : "Full rate",
      value: schedule.qualifying,
    },
    {
      id: "3",
      label: fr ? "Visite 3" : "Visit 3",
      note: fr ? "Tarif complet" : "Full rate",
      value: schedule.qualifying,
    },
    {
      id: "4",
      label: fr ? "Visite 4" : "Visit 4",
      note: fr ? "Crédit cumulé déduit" : "Accumulated credit applied",
      value: schedule.fourth,
    },
    {
      id: "5",
      label: fr ? "Visite 5 et suivantes" : "Visit 5 onward",
      note: fr ? "Tarif récurrent, par visite" : "Recurring rate, per visit",
      value: schedule.recurring,
    },
  ];
}
export function billingCondition(language: BillingLocale) {
  return language === "fr"
    ? "Après 4 visites consécutives réalisées selon la fréquence convenue, l’écart des 3 premières est déduit de la 4e facture. Le tarif récurrent s’applique ensuite. Les suppléments suivent les choix du devis."
    : "After 4 consecutive completed visits at the agreed frequency, the difference from the first 3 is credited on invoice 4. The recurring rate applies thereafter. Extras follow the options in your quote.";
}
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
export function renderBillingSummaryHtml(quote: BillingQuote, language: BillingLocale): string {
  const schedule = readBillingSchedule(quote);
  if (!schedule) return "";
  const fr = language === "fr";
  const rows = billingRows(schedule, language)
    .map(
      (row) =>
        `<tr${row.id === "4" ? ' style="background:#e6f7f3"' : ""}><td style="padding:12px;border-bottom:1px solid #e2e8f0"><strong>${escape(row.label)}</strong><br><span style="font-size:12px;color:#475569">${escape(row.note)}</span></td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;font-weight:800;color:${row.id === "4" ? "#0f766e" : "#0f172a"}">${escape(billingMoney(row.value.total, language))}</td></tr>`,
    )
    .join("");
  return `<div style="margin:22px 0"><h2 style="font-size:20px;color:#0f172a;margin:0 0 6px">${fr ? "Votre facturation, visite par visite" : "Your price, visit by visit"}</h2><p style="margin:0 0 12px;color:#475569;font-size:13px">${fr ? "Montants prévus en CAD, taxes comprises. Chaque montant correspond à une visite." : "Expected amounts in CAD, including tax. Each amount is for one visit."}</p><table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}</tbody></table><p style="font-size:14px;color:#0f766e;font-weight:700">${fr ? "Crédit sur la 4e facture, avant taxes" : "Credit on invoice 4, before tax"} : ${escape(billingMoney(schedule.credit, language))}</p><p style="font-size:13px;line-height:1.6;color:#475569">${escape(billingCondition(language))}</p></div>`;
}
