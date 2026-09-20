import {
  questionnaireLocale,
  questionnaireSections,
} from "../../supabase/functions/_shared/quote-questionnaire";

export type QuoteLine = { description: string; quantity: number; unit_price: number | null };
export type VisitBasis = "first" | "recurring";
export type QuoteRequest = {
  id: string;
  request_number?: string | number;
  customer_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  service_name?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  description?: string | null;
  questionnaire_answers?: Record<string, unknown> | null;
};
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const asText = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const number = (value: unknown) => {
  if (value === null || value === undefined || asText(value) === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10000000 ? n : null;
};
export function quoteTaxRows(subtotal: number, rate: number) {
  if (Math.abs(rate - 0.14975) < 0.000001)
    return [
      { label: "GST / TPS (5 %)", amount: roundMoney(subtotal * 0.05) },
      { label: "QST / TVQ (9.975 %)", amount: roundMoney(subtotal * 0.09975) },
    ];
  return [
    {
      label:
        Math.abs(rate - 0.13) < 0.000001
          ? "HST / TVH (13 %)"
          : `Tax / Taxes (${Number((rate * 100).toFixed(4))} %)`,
      amount: roundMoney(subtotal * rate),
    },
  ];
}
export function quoteTotals(lines: QuoteLine[], rate: number) {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + roundMoney(line.quantity * (line.unit_price ?? 0)), 0),
  );
  const taxes = quoteTaxRows(subtotal, rate);
  const tax = roundMoney(taxes.reduce((sum, row) => sum + row.amount, 0));
  return { subtotal, taxes, tax, total: roundMoney(subtotal + tax) };
}
export function quoteTaxLabel(rate: number) {
  return quoteTaxRows(0, rate)
    .map((row) => row.label)
    .join(" + ");
}

// Read the saved amounts. Never call today's public price calculator when importing a request.
function moneyValue(raw: string): number | null {
  const normalized = raw.replace(/CAD|CA\$|\$|\s/gi, "").replace(/−/g, "-");
  const decimal = normalized.includes(".")
    ? normalized.replace(/,/g, "")
    : normalized.replace(",", ".");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(decimal)) return null;
  const n = Number(decimal);
  return Number.isFinite(n) && Math.abs(n) <= 10000000 ? n : null;
}
function savedExtraLines(raw: string): QuoteLine[] | null {
  if (!raw || /^(none|aucun)$/i.test(raw)) return [];
  const rows: QuoteLine[] = [];
  let bundle = 0;
  for (const value of raw.split(/\n|;\s*/).filter(Boolean)) {
    const match = value.trim().match(/^(.+?)\s*×\s*(\d+(?:\.\d+)?)\s*:\s*(.+?)(?:\s+—\s+.*)?$/);
    if (!match) return null;
    const quantity = Number(match[2]),
      total = moneyValue(match[3]);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000 || total === null)
      return null;
    if (total < 0) {
      if (!/bundle|forfait/i.test(match[1]) || quantity !== 1) return null;
      bundle += -total;
    } else {
      const unit = roundMoney(total / quantity);
      if (roundMoney(quantity * unit) !== total) return null;
      rows.push({ description: match[1], quantity, unit_price: unit });
    }
  }
  // DB line prices must be nonnegative. Keep the two appliances together at their saved net price.
  if (bundle) {
    const fridge = rows.findIndex((row) => /refrigerator|réfrigérateur/i.test(row.description));
    const oven = rows.findIndex((row) => /oven|\bfour\b/i.test(row.description));
    if (fridge < 0 || oven < 0 || fridge === oven) return null;
    const pair = [rows[fridge], rows[oven]];
    const total = roundMoney(
      pair.reduce((sum, row) => sum + row.quantity * row.unit_price!, 0) - bundle,
    );
    if (total < 0) return null;
    const fr = /réfrigérateur/i.test(pair[0].description);
    const description = `${pair.map((row) => `${row.description} × ${row.quantity}`).join(" + ")} — ${fr ? "remise incluse" : "bundle saving included"}: ${bundle.toFixed(2)} CAD`;
    const rest = rows.filter((_, index) => index !== fridge && index !== oven);
    rest.unshift({ description, quantity: 1, unit_price: total });
    return rest;
  }
  return rows;
}
export function requestHasRecurringPrice(request: QuoteRequest) {
  return number(request.questionnaire_answers?.["Recurring visit subtotal CAD"]) !== null;
}
function frequency(answers: Record<string, unknown>): "weekly" | "biweekly" | "monthly" | "custom" {
  const text = `${asText(answers["Requested frequency"])} ${asText(answers.Plan)}`.toLowerCase();
  if (/2 weeks|two weeks|2 semaines|deux semaines|biweekly|14 days|14 jours/.test(text))
    return "biweekly";
  if (/monthly|mensuel|chaque mois|per month|par mois/.test(text)) return "monthly";
  if (
    /once a week|weekly|1 visite par semaine|hebdomadaire|7 days|7 jours/.test(text) ||
    asText(answers["Visits per week"]) === "1"
  )
    return "weekly";
  return "custom";
}
export function buildEstimateDraft(
  request: QuoteRequest,
  basis: VisitBasis = "first",
  defaultTax = 0.13,
) {
  const answers = request.questionnaire_answers ?? {};
  const locale = questionnaireLocale(answers),
    fr = locale === "fr";
  const t = (en: string, french: string) => (fr ? french : en);
  const cash = (n: number) =>
    new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(n);
  const cleaning =
    answers["Request source"] === "cleaning_pricing" ||
    !!answers["Selection summary"] ||
    !!answers["Selection JSON"];
  const recurring = requestHasRecurringPrice(request);
  const recurringVisit = basis === "recurring" && recurring;
  const visit = t(
    recurringVisit ? "Following visit" : recurring ? "First visit" : "Service visit",
    recurringVisit ? "Visite suivante" : recurring ? "Première visite" : "Intervention",
  );
  const plan =
    asText(answers.Plan) || request.service_name || t("Requested service", "Prestation demandée");
  const profile = asText(answers["Property profile"]);
  const province = asText(answers["Estimate province"]) || request.province || "";
  const rate = /^(qc|quebec|québec)$/i.test(province)
    ? 0.14975
    : /^(on|ontario)$/i.test(province)
      ? 0.13
      : defaultTax;
  const prefix = recurringVisit ? "Recurring visit" : "First visit";
  const subtotal = number(answers[`${prefix} subtotal CAD`]);
  const savedTotal = number(answers[`${prefix} total CAD`]);
  const hours = number(answers["Estimated base worker-hours"]);
  const warnings: string[] = [];
  let lines: QuoteLine[] = [
    {
      description: [plan, profile, cleaning ? visit : ""].filter(Boolean).join(" — "),
      quantity: 1,
      unit_price: null,
    },
  ];
  const manual =
    answers["Free on-site assessment required"] === "Yes" ||
    answers["Frequency-based rate review required"] === "Yes";
  let imported = false;
  if (cleaning && subtotal !== null && !manual) {
    const legacy = !asText(answers["Add-on schedule"]) && !!answers["Selection JSON"];
    const rawExtras =
      asText(answers[`${prefix} add-ons`]) || (legacy ? asText(answers["Selected add-ons"]) : "");
    let extras = savedExtraLines(rawExtras);
    const storedExtras = number(answers[`${prefix} add-ons subtotal CAD`]);
    if (extras && storedExtras !== null && quoteTotals(extras, 0).subtotal !== storedExtras)
      extras = null;
    if (!extras && storedExtras !== null) {
      extras =
        storedExtras > 0
          ? [
              {
                description: `${t("Selected extras (saved package)", "Suppléments choisis (forfait enregistré)")} — ${rawExtras}`,
                quantity: 1,
                unit_price: storedExtras,
              },
            ]
          : [];
      warnings.push(
        t(
          "The saved extras were grouped; review their detail in the original request.",
          "Les suppléments enregistrés ont été regroupés ; vérifiez leur détail dans la demande.",
        ),
      );
    }
    if (extras) {
      const extrasTotal = quoteTotals(extras, 0).subtotal;
      const base = roundMoney(subtotal - extrasTotal);
      let baseRate = number(
        answers[
          recurringVisit
            ? "Base rate CAD per worker-hour"
            : "First visit base rate CAD per worker-hour"
        ],
      );
      if (baseRate === null && hours && base >= 0) baseRate = roundMoney(base / hours);
      if (base >= 0) {
        const baseDescription = `${plan}${profile ? ` — ${profile}` : ""} — ${visit}`;
        lines =
          base > 0
            ? [
                {
                  description: `${baseDescription} (${t("worker-hours", "heures-personnes")})`,
                  quantity:
                    hours && baseRate !== null && roundMoney(hours * baseRate) === base ? hours : 1,
                  unit_price:
                    hours && baseRate !== null && roundMoney(hours * baseRate) === base
                      ? baseRate
                      : base,
                },
              ]
            : [];
        lines.push(...extras);
      } else extras = null;
    }
    if (!extras || !lines.length || quoteTotals(lines, 0).subtotal !== subtotal) {
      lines = [
        {
          description: `${plan} — ${profile} — ${visit}. ${t("Saved package; see the request detail", "Forfait enregistré ; voir le détail de la demande")}`,
          quantity: 1,
          unit_price: subtotal,
        },
      ];
      warnings.push(
        t(
          "The saved package total was retained; item-by-item pricing needs review.",
          "Le total du forfait enregistré est conservé ; vérifiez la ventilation des services.",
        ),
      );
    }
    imported = true;
    if (savedTotal !== null && quoteTotals(lines, rate).total !== savedTotal) {
      warnings.push(
        t(
          "The saved tax total does not match the province. Confirm the price and taxes before saving.",
          "Les taxes enregistrées ne concordent pas avec la province. Vérifiez le prix et les taxes avant d’enregistrer.",
        ),
      );
      imported = false;
    }
  } else {
    warnings.push(
      t(
        "No automatic price is available. Enter the agreed price and duration after reviewing the request.",
        "Aucun prix automatique disponible. Saisissez le prix et la durée après étude de la demande.",
      ),
    );
  }
  const sections = questionnaireSections(answers, locale);
  const requestDetails = (cleaning ? sections.slice(0, 2) : sections)
    .map(
      (section) =>
        `${section.title}\n${section.rows.map((row) => `${row.label}: ${row.value}`).join("\n")}`,
    )
    .join("\n\n");
  const address = [request.address_line, request.city, request.province, request.postal_code]
    .filter(Boolean)
    .join(", ");
  const notes = [
    `${t("Request", "Demande")} #${request.request_number ?? request.id}`,
    cleaning
      ? t(
          `This quote covers one ${recurringVisit ? "following" : "first"} visit. Other visits and monthly figures below are provisional references from the original request, not additional charges in this total.`,
          `Ce devis porte sur une ${recurringVisit ? "visite suivante" : "première visite"}. Les autres visites et montants mensuels ci-dessous restent des références provisoires de la demande initiale et ne s’ajoutent pas à ce total.`,
        )
      : "",
    `${t("Contact", "Contact")}: ${[request.first_name, request.last_name].filter(Boolean).join(" ")} — ${[request.email, request.phone].filter(Boolean).join(" · ")}`,
    address ? `${t("Service address", "Adresse d’intervention")}: ${address}` : "",
    request.preferred_date || request.preferred_time
      ? `${t("Requested date/time (to confirm)", "Date/heure souhaitée (à confirmer)")}: ${[request.preferred_date, request.preferred_time].filter(Boolean).join(" · ")}`
      : "",
    request.description ? `${t("Customer notes", "Notes du client")}: ${request.description}` : "",
    requestDetails,
    ...(
      [
        [
          "Recurring visit subtotal CAD",
          "Original provisional subtotal per following visit",
          "Sous-total provisoire initial par visite suivante",
        ],
        [
          "Recurring visit total CAD",
          "Original provisional total per following visit",
          "Total provisoire initial par visite suivante",
        ],
        [
          "Average recurring month before tax CAD",
          "Original average monthly budget before tax (following visits only)",
          "Budget mensuel moyen initial avant taxes (visites suivantes seulement)",
        ],
      ] as const
    ).flatMap(([key, en, french]) => {
      const amount = number(answers[key]);
      return amount === null ? [] : [`${t(en, french)}: ${cash(amount)}`];
    }),
    answers["Quality photos consent"] === "Yes" || answers["Quality photos consent"] === "No"
      ? `${t("Quality photos authorized", "Photos de contrôle qualité autorisées")}: ${answers["Quality photos consent"] === "Yes" ? t("Yes — private before/after report only", "Oui — rapport privé avant/après seulement") : t("No", "Non")}`
      : "",
    savedTotal !== null
      ? `${t("Original provisional total for this visit", "Total provisoire initial pour cette visite")}: ${cash(savedTotal)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    title: [plan, cleaning ? visit : ""].filter(Boolean).join(" — "),
    notes,
    lines,
    taxRate: rate,
    currency: cleaning ? "CAD" : null,
    hours: hours && hours <= 24 ? hours : null,
    serviceType: recurringVisit ? ("recurring" as const) : ("one_time" as const),
    frequency: frequency(answers),
    recurring,
    locale,
    imported,
    warnings,
    savedSubtotal: subtotal,
    savedTotal,
    basis: recurringVisit ? ("recurring" as const) : ("first" as const),
  };
}
