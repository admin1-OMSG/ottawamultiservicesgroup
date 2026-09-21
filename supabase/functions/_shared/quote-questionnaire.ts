// Pure presentation helpers shared by the CRM and its Supabase notification.
// Historical requests are displayed from stored answers, never repriced.
export type QuestionnaireLocale = "en" | "fr";
export type QuestionnaireSection = { title: string; rows: { label: string; value: string }[] };

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function questionnaireLocale(value: unknown): QuestionnaireLocale {
  const answers = record(value);
  return (answers.preferredLanguage ?? answers["Preferred Language"]) === "fr" ? "fr" : "en";
}

const fieldName = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

function readable(value: unknown, locale: QuestionnaireLocale, depth = 0): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean")
    return value ? (locale === "fr" ? "Oui" : "Yes") : locale === "fr" ? "Non" : "No";
  if (Array.isArray(value))
    return value
      .map((item) => readable(item, locale, depth + 1))
      .filter(Boolean)
      .join("; ");
  if (typeof value === "object") {
    if (depth > 3) return locale === "fr" ? "Détails complémentaires" : "Additional details";
    return Object.entries(record(value))
      .map(([key, item]) => `${fieldName(key)}: ${readable(item, locale, depth + 1)}`)
      .join("\n");
  }
  return String(value);
}

function legacySummary(answers: Record<string, unknown>, locale: QuestionnaireLocale): string {
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en);
  let saved: Record<string, unknown> = {};
  const raw = answers["Selection JSON"];
  if (typeof raw === "string" && raw.length < 50000) {
    try {
      saved = record(JSON.parse(raw));
    } catch {
      /* Use the existing readable fields. */
    }
  }
  const planNames: Record<string, string> = {
    weekly: t("Once a week", "1 visite par semaine"),
    biweekly: t("Once every 2 weeks", "1 visite toutes les 2 semaines"),
    monthly: t("Monthly", "Chaque mois"),
    recurring: t("Scheduled commercial cleaning", "Entretien commercial récurrent"),
    once: t("One-time standard", "Nettoyage standard ponctuel"),
    deep: t("Deep cleaning", "Nettoyage en profondeur"),
    flexible: t("Custom schedule", "Fréquence personnalisée"),
    specialist: t("Specialist service", "Service spécialisé"),
    extras: t("Add-ons only", "Options seules"),
  };
  const audience = answers["Customer type"] ?? saved.audience;
  const condition = answers.Condition ?? saved.condition;
  const items = [
    [
      t("Space", "Espace"),
      audience === "residential"
        ? t("Residential", "Résidentiel")
        : audience === "commercial"
          ? t("Commercial", "Commercial")
          : audience,
    ],
    [t("Service", "Prestation"), answers.Plan ?? planNames[String(saved.plan)]],
    [t("Property", "Lieu"), answers["Property profile"]],
    [t("Schedule", "Fréquence"), answers["Requested frequency"] ?? saved.customFrequency],
    [
      t("Condition", "État"),
      condition === "normal"
        ? t("Normal use", "Usage normal")
        : condition === "heavy"
          ? t(
              "Heavy buildup / specialist assessment",
              "Encrassement important / évaluation spécialisée",
            )
          : condition,
    ],
    [t("Province", "Province"), answers["Estimate province"] ?? saved.province],
  ];
  return (
    items
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([label, value]) => `${label}: ${readable(value, locale)}`)
      .join("\n") ||
    t(
      "See the service and customer details in this request.",
      "Consultez la prestation et les coordonnées dans cette demande.",
    )
  );
}

export function questionnaireSections(
  value: unknown,
  locale = questionnaireLocale(value),
): QuestionnaireSection[] {
  const answers = record(value);
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const cleaning =
    answers["Request source"] === "cleaning_pricing" ||
    "Selection JSON" in answers ||
    "Selection summary" in answers;
  if (!cleaning) {
    const rows = Object.entries(answers)
      .filter(([, raw]) => raw !== null && raw !== undefined && raw !== "")
      .map(([key, raw]) => ({ label: fieldName(key), value: readable(raw, locale) }));
    return rows.length
      ? [{ title: t("Questionnaire responses", "Réponses au questionnaire"), rows }]
      : [];
  }
  const plain = (key: string) => readable(answers[key], locale);
  const row = (key: string, en: string, fr: string, currency = false) => {
    const raw = answers[key];
    if (
      raw === undefined ||
      raw === null ||
      raw === "" ||
      raw === "Not applicable" ||
      raw === "Not requested"
    )
      return [];
    let rendered = readable(raw, locale);
    if (currency && rendered.trim() && Number.isFinite(Number(rendered))) {
      rendered = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(rendered));
    } else if (rendered === "Yes" || rendered === "No")
      rendered = rendered === "Yes" ? t("Yes", "Oui") : t("No", "Non");
    else if (rendered === "Email") rendered = t("Email", "Courriel");
    else if (rendered === "Phone") rendered = t("Phone", "Téléphone");
    else if (rendered === "None") rendered = t("None", "Aucun");
    return [{ label: t(en, fr), value: rendered }];
  };
  const summary = plain("Selection summary") || legacySummary(answers, locale);
  const legacy = !answers["Add-on schedule"] && !!answers["Selection JSON"];
  const fourVisits = answers["Recurring billing policy"] === "four-consecutive-v1";
  const selected = plain("Add-on schedule") || plain("Selected add-ons");
  const sections: QuestionnaireSection[] = [
    {
      title: t("Requested cleaning", "Nettoyage demandé"),
      rows: [
        { label: t("Selection summary", "Résumé des choix"), value: summary },
        ...row("Business name", "Business or organization", "Entreprise ou organisation"),
        ...row("Business type", "Type of premises", "Type de local"),
        ...row(
          "Free on-site assessment required",
          "Free site visit required",
          "Visite gratuite nécessaire",
        ),
        ...row(
          "Frequency-based rate review required",
          "Schedule requires a revised price",
          "Tarif à réviser selon la fréquence",
        ),
      ],
    },
    {
      title: t("Optional extras and frequency", "Suppléments et fréquence"),
      rows: [
        { label: t("Selected extras", "Options choisies"), value: selected || t("None", "Aucun") },
        ...row("Add-on recurrence policy", "How extras apply", "Application des suppléments"),
        ...(legacy &&
        answers["Recurring visit subtotal CAD"] &&
        answers["Recurring visit subtotal CAD"] !== "Not applicable"
          ? [
              {
                label: t("Previous request", "Demande antérieure"),
                value: t(
                  "This earlier estimate included the selected extras at every recurring visit. No new frequency choice has been applied to this saved request.",
                  "Cette ancienne estimation incluait les suppléments sélectionnés à chaque visite récurrente. Aucun nouveau choix de fréquence n’a été appliqué à cette demande enregistrée.",
                ),
              },
            ]
          : []),
      ],
    },
    {
      title: t("Recurring-rate condition", "Condition du tarif récurrent"),
      rows: [
        ...row(
          "Recurring pricing condition",
          "Four consecutive visits",
          "Quatre visites consécutives",
        ),
        ...row(
          "Four-visit billing schedule",
          "Billing schedule (visit totals include tax)",
          "Échéancier (totaux des visites taxes comprises)",
        ),
      ],
    },
    {
      title: t("First visit · provisional estimate", "Première visite · estimation provisoire"),
      rows: [
        ...row("Estimated base worker-hours", "Base worker-hours", "Heures-personnes de base"),
        ...row(
          "First visit base rate CAD per worker-hour",
          "Initial rate per worker-hour",
          "Tarif initial par heure-personne",
          true,
        ),
        ...row(
          "First visit add-ons",
          "Extra services and bundle saving",
          "Suppléments et remise du forfait",
        ),
        ...row(
          "First visit add-ons subtotal CAD",
          "Extras before tax",
          "Suppléments avant taxes",
          true,
        ),
        ...row("First visit subtotal CAD", "Subtotal before tax", "Sous-total avant taxes", true),
        ...row("First visit taxes", "Taxes", "Taxes"),
        ...row("First visit total CAD", "Total including tax", "Total taxes comprises", true),
      ],
    },
    {
      title: fourVisits
        ? t("Eligible rate · visit 5 onward", "Tarif admissible · à partir de la visite 5")
        : t("Following visits · provisional estimate", "Visites suivantes · estimation provisoire"),
      rows: [
        ...(answers["Recurring visit subtotal CAD"] &&
        answers["Recurring visit subtotal CAD"] !== "Not applicable"
          ? row(
              "Base rate CAD per worker-hour",
              "Recurring rate per worker-hour",
              "Tarif récurrent par heure-personne",
              true,
            )
          : []),
        ...row(
          "Recurring visit add-ons",
          "Extras included at each visit",
          "Options comprises à chaque visite",
        ),
        ...row(
          "Recurring visit add-ons subtotal CAD",
          "Recurring extras before tax",
          "Suppléments récurrents avant taxes",
          true,
        ),
        ...row(
          "Recurring visit subtotal CAD",
          "Subtotal per visit before tax",
          "Sous-total par visite avant taxes",
          true,
        ),
        ...row("Recurring visit taxes", "Taxes per visit", "Taxes par visite"),
        ...row(
          "Recurring visit total CAD",
          "Total per visit including tax",
          "Total par visite taxes comprises",
          true,
        ),
        ...(Number(answers["Recurring package saving before tax CAD"]) > 0
          ? row(
              "Recurring package saving before tax CAD",
              "Base package saving before tax",
              "Économie sur le forfait de base avant taxes",
              true,
            )
          : []),
        ...row(
          "Average recurring month before tax CAD",
          "Average month before tax",
          "Mois moyen avant taxes",
          true,
        ),
        ...(answers["Average recurring month before tax CAD"] &&
        answers["Average recurring month before tax CAD"] !== "Not applicable"
          ? row("Monthly budget basis", "Monthly budget basis", "Base du budget mensuel")
          : []),
      ],
    },
    {
      title: t("Contact and follow-up", "Contact et suivi"),
      rows: [
        ...row("preferredContactMethod", "Preferred contact method", "Moyen de contact souhaité"),
        ...row("Contact consent", "Permission to contact", "Autorisation de contact"),
        ...row(
          "Quality photos consent",
          "Permission for quality photos",
          "Autorisation des photos de suivi",
        ),
        ...(answers["Quality photos consent"] === "Yes"
          ? [
              {
                label: t("Photo use", "Utilisation des photos"),
                value: t(
                  "Private before/after quality report for this customer. No permission for promotional publication.",
                  "Rapport qualité privé avant/après destiné à ce client. Aucune autorisation de publication promotionnelle.",
                ),
              },
            ]
          : []),
        ...row(
          "Contact consent recorded at",
          "Contact consent recorded at",
          "Consentement de contact enregistré le",
        ),
        ...row(
          "Quality photos consent recorded at",
          "Photo choice recorded at",
          "Choix concernant les photos enregistré le",
        ),
        ...row("Estimate status", "Quote status", "Statut du devis"),
        ...row("Pricing version", "Pricing version", "Version des tarifs"),
      ],
    },
  ];
  const scope = answers[`Service scope ${locale.toUpperCase()}`];
  if (typeof scope === "string" && scope.trim()) sections.push({
    title: t("Proposed service details", "Détail des prestations proposées"),
    rows: [{ label: t("Tasks and frequency (reviewed in the official quote)", "Tâches et fréquence (validées au devis officiel)"), value: scope.replace(/^## /gm, "") }],
  });
  return sections.filter((section) => section.rows.length > 0);
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function renderQuestionnaireHtml(
  value: unknown,
  locale = questionnaireLocale(value),
): string {
  return questionnaireSections(value, locale)
    .map((section) => {
      const rows = section.rows
        .map((row) => {
          const label = escapeHtml(row.label);
          const rendered = escapeHtml(row.value).replaceAll("\n", "<br>");
          if (row.value.includes("\n") || row.value.length > 140) {
            return `<tr><td colspan="2" style="padding:12px 0;border-bottom:1px solid #f1f5f9;overflow-wrap:anywhere"><div style="margin-bottom:6px;color:#64748b">${label}</div><div>${rendered}</div></td></tr>`;
          }
          const weight = row.label.startsWith("Total") ? "font-weight:700;" : "";
          return `<tr><td style="width:48%;padding:9px 12px 9px 0;vertical-align:top;color:#64748b;border-bottom:1px solid #f1f5f9;overflow-wrap:anywhere;${weight}">${label}</td><td style="padding:9px 0;vertical-align:top;border-bottom:1px solid #f1f5f9;overflow-wrap:anywhere;${weight}">${rendered}</td></tr>`;
        })
        .join("");
      return `<h3 style="margin:24px 0 10px;color:#115e59;font-size:17px">${escapeHtml(section.title)}</h3><table role="presentation" style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:14px;line-height:1.6">${rows}</table>`;
    })
    .join("");
}
