import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { CleaningQuoteRequest } from "@/components/cleaning-quote-request";
import {
  ADDONS,
  BUSINESS_PROFILES,
  HOME_PROFILES,
  frequencyLabel,
  addonPrice,
  addonFrequency,
  isRecurringSelection,
  type AddonFrequency,
  calculateCleaningEstimate,
  initialSelection,
  money,
  plansFor,
  type Audience,
  type PlanId,
  type PricingSelection,
} from "@/lib/cleaning-pricing";

export function CleaningEstimatePage({
  audience,
  initialPlan,
}: {
  audience: Audience;
  initialPlan: PlanId;
}) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [selection, setSelection] = useState<PricingSelection>(() => ({
    ...initialSelection(audience),
    plan: initialPlan,
    visitsPerWeek: initialPlan === "flexible" ? 2 : 1,
  }));
  const [checkout, setCheckout] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string; missingPhotos: boolean } | null>(
    null,
  );
  const contact = useRef<HTMLElement>(null);
  const estimate = useMemo(() => calculateCleaningEstimate(selection), [selection]);
  const residential = audience === "residential",
    profiles = residential ? HOME_PROFILES : BUSINESS_PROFILES;
  const update = <K extends keyof PricingSelection>(key: K, value: PricingSelection[K]) =>
    setSelection((s) => ({
      ...s,
      [key]: value,
      ...(key === "plan"
        ? {
            visitsPerWeek:
              value === "flexible"
                ? s.visitsPerWeek > 1
                  ? s.visitsPerWeek
                  : 2
                : value === "recurring"
                  ? 1
                  : s.visitsPerWeek,
          }
        : {}),
    }));
  const book = () => {
    setCheckout(true);
    setTimeout(() => contact.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const area = profiles.find((p) => p.id === selection.profile)?.area ?? 0;
  const planList = plansFor(audience);
  const recurringSelection = isRecurringSelection(selection);
  useEffect(() => {
    if (confirmation) window.scrollTo({ top: 0, behavior: "instant" });
  }, [confirmation]);

  if (confirmation)
    return (
      <main data-i18n-ignore="true" className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-teal-100 bg-white p-7 sm:p-10">
          <div role="status" className="space-y-4">
            <CheckCircle2 className="h-10 w-10 text-teal-700" />
            <h4 className="text-xl font-semibold">
              {t("Your request has been received", "Votre demande a bien été reçue")}
            </h4>
            <p className="leading-7 text-slate-600">
              {t(
                "Our team will review your choices and contact you with your official quote or arrange the free visit. No appointment or payment has been confirmed yet.",
                "Notre équipe examinera vos choix et vous contactera pour le devis officiel ou la visite gratuite. Aucun rendez-vous ni paiement n’est encore confirmé.",
              )}
            </p>
            <p className="break-all text-sm">
              {t("Reference", "Référence")} : {confirmation.id}
            </p>
            {confirmation.missingPhotos && (
              <p className="text-sm text-amber-900">
                {t(
                  "Your request is saved, but some photos did not upload. You can send them later; do not submit a second request.",
                  "Votre demande est enregistrée, mais certaines photos n’ont pas été transférées. Vous pourrez les transmettre plus tard ; inutile de refaire la demande.",
                )}
              </p>
            )}
          </div>
          <Link
            to="/pricing"
            className="mt-7 inline-flex font-semibold text-teal-800 underline underline-offset-4"
          >
            {t("Back to cleaning prices", "Retour aux tarifs de nettoyage")}
          </Link>
        </div>
      </main>
    );

  return (
    <main data-i18n-ignore="true" className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <Link
        to={residential ? "/pricing/residential" : "/pricing/commercial"}
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t("Back to services and prices", "Retour aux prestations et tarifs")}
      </Link>
      <div className="mt-7 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
          {residential
            ? t("Residential · Ottawa & Gatineau", "Résidentiel · Ottawa et Gatineau")
            : t("Commercial · Ottawa & Gatineau", "Commercial · Ottawa et Gatineau")}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("Make it your clean.", "Votre nettoyage, à votre mesure.")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t(
            "Tell us about your space, choose your extras and review your estimate. Requesting your official quote is free, with no payment now.",
            "Précisez votre espace, choisissez vos options et consultez votre estimation. Demandez ensuite votre devis officiel gratuitement, sans paiement immédiat.",
          )}
        </p>
      </div>
      <section id="estimate" className="mt-8 scroll-mt-28">
        <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border bg-white p-5 sm:p-6">
              <h3 className="text-lg font-semibold">
                {t("1. Your space and service", "1. Votre espace et la prestation")}
              </h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  {t("Cleaning plan", "Prestation")}
                  <select
                    className="min-h-11 min-w-0 rounded-lg border bg-white px-3"
                    value={selection.plan}
                    onChange={(e) => update("plan", e.target.value as PlanId)}
                  >
                    {planList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name[language]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {t("Service province", "Province de l’intervention")}
                  <select
                    className="min-h-11 rounded-lg border bg-white px-3"
                    value={selection.province}
                    onChange={(e) =>
                      update("province", e.target.value as PricingSelection["province"])
                    }
                  >
                    <option value="Ontario">Ontario · Ottawa</option>
                    <option value="Quebec">Québec · Gatineau</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                  {residential
                    ? t(
                        "Choose the profile that covers your whole home",
                        "Choisissez le profil couvrant tout votre logement",
                      )
                    : t("Space size and typical occupancy", "Superficie et occupation habituelle")}
                  <select
                    className="min-h-11 min-w-0 max-w-full rounded-lg border bg-white px-3"
                    value={selection.profile}
                    onChange={(e) => update("profile", e.target.value)}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label[language]}
                      </option>
                    ))}
                  </select>
                </label>
                {!residential && (
                  <label className="grid gap-2 text-sm font-medium">
                    {t("Type of premises", "Type de local")}
                    <select
                      className="min-h-11 rounded-lg border bg-white px-3"
                      value={selection.businessType}
                      onChange={(e) =>
                        update("businessType", e.target.value as PricingSelection["businessType"])
                      }
                    >
                      {[
                        ["office", t("Office / reception", "Bureau / réception")],
                        ["retail", t("Shop", "Commerce")],
                        ["common", t("Condominium common areas", "Parties communes")],
                        [
                          "specialist",
                          t(
                            "Clinical, industrial or production area",
                            "Zone de soins, industrie ou production",
                          ),
                        ],
                      ].map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(selection.plan === "flexible" ||
                  (!residential && selection.plan === "recurring")) && (
                  <label className="grid gap-2 text-sm font-medium">
                    {t("Visits per week", "Passages par semaine")}
                    <select
                      className="min-h-11 rounded-lg border bg-white px-3"
                      value={selection.visitsPerWeek}
                      onChange={(e) => update("visitsPerWeek", Number(e.target.value))}
                    >
                      {(selection.plan === "flexible"
                        ? [2, 3, 4, 5, 6, 7]
                        : [1, 2, 3, 4, 5, 6, 7]
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                      <option value={0}>{t("Other schedule", "Autre fréquence")}</option>
                    </select>
                  </label>
                )}
                {(selection.plan === "flexible" ||
                  (!residential && selection.plan === "recurring")) &&
                  selection.visitsPerWeek === 0 && (
                    <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                      {t("Describe your preferred schedule", "Précisez la fréquence souhaitée")}
                      <input
                        className="min-h-11 min-w-0 rounded-lg border bg-white px-3"
                        maxLength={240}
                        value={selection.customFrequency}
                        onChange={(e) => update("customFrequency", e.target.value)}
                        placeholder={t(
                          "For example: twice daily, Monday to Friday",
                          "Exemple : deux passages par jour, du lundi au vendredi",
                        )}
                      />
                    </label>
                  )}
                <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                  {t("Current condition", "État actuel")}
                  <select
                    className="min-h-11 min-w-0 rounded-lg border bg-white px-3"
                    value={selection.condition}
                    onChange={(e) =>
                      update("condition", e.target.value as PricingSelection["condition"])
                    }
                  >
                    <option value="normal">
                      {t(
                        "Normal use / ordinary household buildup",
                        "Usage normal / saleté domestique habituelle",
                      )}
                    </option>
                    <option value="heavy">
                      {t(
                        "Heavy buildup, construction, mould or water damage",
                        "Encrassement important, chantier, moisissures ou dégât d’eau",
                      )}
                    </option>
                  </select>
                </label>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {residential
                  ? t(
                      "Profiles include one kitchen and living area, excluding basement and garage. Extra-room options apply only outside this profile. A half bathroom means a toilet and sink without a bath or shower.",
                      "Chaque profil inclut une cuisine et un espace de vie, hors sous-sol et garage. Les pièces supplémentaires concernent uniquement celles hors profil. Une demi-salle de bain correspond à un WC et lavabo, sans bain ni douche.",
                    )
                  : t(
                      "Profiles assume normal traffic, one kitchenette and the stated maximum workstations and toilets. More facilities or different requirements? Choose the custom profile. Time is a planning estimate, confirmed after reviewing your premises.",
                      "Les profils supposent une fréquentation normale, une kitchenette et les maxima de postes et WC indiqués. Plus d’équipements ou d’autres besoins ? Choisissez le profil sur mesure. La durée est indicative et confirmée après examen des lieux.",
                    )}
              </p>
            </section>

            <section className="rounded-xl border bg-white p-5 sm:p-6">
              <h3 className="text-lg font-semibold">
                {t("2. Add what you need", "2. Ajoutez les options utiles")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t(
                  "Optional extras for your provisional fixed-price quote. Select fridge and oven together for $65 instead of $70 separately.",
                  "Options facultatives pour votre devis provisoire au forfait. Sélectionnez réfrigérateur et four pour 65 $ au lieu de 70 $ séparément.",
                )}
              </p>
              <p className="mt-3 text-sm font-medium leading-6 text-teal-900">
                {recurringSelection
                  ? t(
                      "Extras are for the first visit only by default. For each selected extra, choose whether you want it at every visit.",
                      "Par défaut, les suppléments concernent uniquement la première visite. Pour chaque option choisie, indiquez si vous la souhaitez à chaque visite.",
                    )
                  : t(
                      "These extras apply to this single visit.",
                      "Ces suppléments concernent cette visite unique.",
                    )}
              </p>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-teal-50 p-3 text-sm">
                <Sparkles className="h-5 w-5 text-teal-800" />
                <span>
                  {t("Fridge + oven", "Réfrigérateur + four")}{" "}
                  <s className="mx-1 text-slate-500">{money(70, language)}</s>{" "}
                  <strong>{money(65, language)}</strong> ·{" "}
                  {t("$5 bundle saving", "5 $ d’économie en forfait")}
                </span>
              </div>
              {(["kitchen", "rooms", "detail"] as const).map((group) => (
                <details key={group} className="mt-4 border-t pt-4">
                  <summary className="cursor-pointer py-1 font-semibold">
                    {group === "kitchen"
                      ? t("Kitchen and appliances", "Cuisine et appareils")
                      : group === "rooms"
                        ? t("Rooms, linen and tidying", "Pièces, linge et rangement")
                        : t("Windows and detailed tasks", "Vitres et tâches détaillées")}
                  </summary>
                  <div className="mt-3 divide-y">
                    {ADDONS.filter(
                      (a) => a.group === group && (!a.residentialOnly || residential),
                    ).map((a) => {
                      const included = selection.plan === "deep" && a.includedInDeep;
                      const quantity = included ? 0 : (selection.addons[a.id] ?? 0);
                      return (
                        <div key={a.id} className="flex items-start justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <label htmlFor={`addon-${a.id}`} className="font-medium text-slate-900">
                              {a.name[language]}
                            </label>
                            <p
                              id={`scope-${a.id}`}
                              className="mt-1 text-sm leading-6 text-slate-600"
                            >
                              {a.scope[language]}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-teal-800">
                              {included
                                ? t(
                                    "Included in your deep clean",
                                    "Inclus dans votre nettoyage en profondeur",
                                  )
                                : `${money(addonPrice(a, selection, area), language)} / ${a.unit[language]}`}
                            </p>
                            {quantity > 0 && !included && recurringSelection && (
                              <label className="mt-3 grid max-w-full gap-1 text-xs font-medium text-slate-600">
                                {t("When?", "Quand ?")}
                                <select
                                  id={`frequency-${a.id}`}
                                  aria-label={`${t("Frequency for", "Fréquence pour")} ${a.name[language]}`}
                                  className="min-h-11 w-full min-w-0 rounded-lg border bg-white px-2 text-sm text-slate-900"
                                  value={addonFrequency(selection, a.id)}
                                  onChange={(event) =>
                                    setSelection((current) => ({
                                      ...current,
                                      addonFrequencies: {
                                        ...current.addonFrequencies,
                                        [a.id]: event.target.value as AddonFrequency,
                                      },
                                    }))
                                  }
                                >
                                  <option value="first">
                                    {t("First visit only", "Première visite seulement")}
                                  </option>
                                  <option value="every">
                                    {t("Every visit", "À chaque visite")}
                                  </option>
                                </select>
                              </label>
                            )}
                          </div>
                          <select
                            id={`addon-${a.id}`}
                            aria-describedby={`scope-${a.id}`}
                            className="min-h-10 w-16 shrink-0 rounded-lg border bg-white px-2 disabled:bg-slate-100"
                            disabled={included}
                            value={quantity}
                            onChange={(e) =>
                              setSelection((s) => ({
                                ...s,
                                addons: { ...s.addons, [a.id]: Number(e.target.value) },
                              }))
                            }
                          >
                            <option value={0}>0</option>
                            {Array.from(
                              { length: a.max - (a.min ?? 1) + 1 },
                              (_, n) => n + (a.min ?? 1),
                            ).map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {t(
                  "Quantities above the listed limits and specialist equipment are quoted after a free visit. Photos are recommended, not required.",
                  "Quantités dépassant les limites et matériel spécialisé : devis après visite gratuite. Photos recommandées, non obligatoires.",
                )}
              </p>
            </section>
            {checkout && (
              <section
                ref={contact}
                id="official-quote"
                className="scroll-mt-28 rounded-xl border bg-white p-5 sm:p-6"
              >
                <h3 className="mb-4 text-xl font-semibold">
                  {t("3. Request your official quote", "3. Demandez votre devis officiel")}
                </h3>
                <CleaningQuoteRequest
                  selection={selection}
                  estimate={estimate}
                  locale={language}
                  onProvinceChange={(v) => update("province", v)}
                  onSaved={(id, missingPhotos) => setConfirmation({ id, missingPhotos })}
                />
              </section>
            )}
          </div>

          <aside
            className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm lg:sticky lg:top-28"
            aria-label={t("Provisional estimate", "Estimation provisoire")}
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">
              {t("Your provisional estimate", "Votre estimation provisoire")}
            </p>
            {estimate.requiresQuote ? (
              <div className="mt-4">
                {estimate.requiresRateReview && (
                  <p className="mb-3 text-sm font-medium text-teal-800">
                    {frequencyLabel(selection, language)}
                  </p>
                )}
                <h3 className="text-2xl font-bold text-slate-900">
                  {estimate.requiresVisit
                    ? t("Let’s assess your space", "Évaluons vos besoins sur place")
                    : t("A price for your schedule", "Un tarif adapté à votre fréquence")}
                </h3>
                <p className="mt-4 leading-7 text-slate-600">
                  {estimate.requiresVisit
                    ? t(
                        "A free on-site visit is needed to confirm the work and provide a precise quote. Your selected options will be sent with your request.",
                        "Une visite gratuite est nécessaire pour confirmer les travaux et fournir un devis précis. Vos options seront transmises avec la demande.",
                      )
                    : t(
                        "We will review the rate and package for your requested frequency, tasks and time per visit. Send your choices for a tailored quote; the standard weekly rate is not applied automatically.",
                        "Nous réviserons le tarif et le forfait selon la fréquence demandée, les tâches et la durée par passage. Transmettez vos choix pour un devis personnalisé ; le tarif hebdomadaire standard n’est pas appliqué automatiquement.",
                      )}
                </p>
                <p className="mt-4 font-semibold text-teal-800">
                  {estimate.requiresVisit
                    ? t(
                        "Free assessment · no payment now",
                        "Visite gratuite · aucun paiement maintenant",
                      )
                    : t("Free quote · no payment now", "Devis gratuit · aucun paiement maintenant")}
                </p>
              </div>
            ) : (
              <>
                <div aria-live="polite" aria-atomic="true">
                  <div className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                    {money(estimate.total, language)}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {t(
                      "Estimated first visit, taxes included",
                      "Première visite estimée, taxes comprises",
                    )}
                  </p>
                </div>
                <dl className="mt-6 space-y-3 text-sm">
                  {estimate.hours > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt>
                        {estimate.hours.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")}{" "}
                        {t("worker-hours", "heures-personnes")} ×{" "}
                        {money(estimate.firstRate, language)}
                      </dt>
                      <dd className="font-semibold">
                        {money(estimate.hours * estimate.firstRate, language)}
                      </dd>
                    </div>
                  )}
                  {estimate.lines.map((line) => (
                    <div
                      key={line.id}
                      className={`flex justify-between gap-4 ${line.total < 0 ? "text-teal-800" : ""}`}
                    >
                      <dt>
                        {line.label[language]}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                        {estimate.recurring && (
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            {line.frequency === "every"
                              ? t("Every visit", "À chaque visite")
                              : t("First visit only", "Première visite seulement")}
                          </span>
                        )}
                      </dt>
                      <dd className="shrink-0">{money(line.total, language)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 border-t pt-3 font-semibold">
                    <dt>{t("Before tax", "Avant taxes")}</dt>
                    <dd>{money(estimate.firstSubtotal, language)}</dd>
                  </div>
                  {estimate.taxes.map((tax) => (
                    <div key={tax.name.en} className="flex justify-between gap-4 text-slate-600">
                      <dt>{tax.name[language]}</dt>
                      <dd>{money(tax.amount, language)}</dd>
                    </div>
                  ))}
                </dl>
                {estimate.recurring && (
                  <div className="mt-5 border-t pt-5">
                    <p className="text-sm font-semibold">
                      {t("Following visits", "Visites suivantes")}
                    </p>
                    <p className="mt-1 text-xl font-bold text-teal-800">
                      {money(estimate.subsequentTotal, language)}{" "}
                      <span className="text-sm font-normal">
                        {t("incl. tax / visit", "TTC / visite")}
                      </span>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {t(
                        "Only extras marked Every visit are included below.",
                        "Seules les options À chaque visite sont comprises ci-dessous.",
                      )}
                    </p>
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-medium text-teal-800">
                        {t("See following-visit details", "Voir le détail des visites suivantes")}
                      </summary>
                      <dl className="mt-3 space-y-3">
                        <div className="flex justify-between gap-3">
                          <dt>
                            {estimate.hours} {t("worker-hours", "heures-personnes")} ×{" "}
                            {money(estimate.rate, language)}
                          </dt>
                          <dd className="shrink-0">{money(estimate.base, language)}</dd>
                        </div>
                        {estimate.recurringLines.map((line) => (
                          <div key={line.id} className="flex justify-between gap-3">
                            <dt>
                              {line.label[language]}
                              {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                            </dt>
                            <dd className="shrink-0">{money(line.total, language)}</dd>
                          </div>
                        ))}
                        {estimate.recurringLines.length === 0 && (
                          <div className="text-slate-500">
                            <dt>{t("No recurring extras", "Aucun supplément récurrent")}</dt>
                            <dd className="sr-only">0</dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-3 border-t pt-3 font-medium">
                          <dt>{t("Before tax", "Avant taxes")}</dt>
                          <dd>{money(estimate.subtotal, language)}</dd>
                        </div>
                        {estimate.subsequentTaxes.map((tax) => (
                          <div
                            key={tax.name.en}
                            className="flex justify-between gap-3 text-slate-600"
                          >
                            <dt>{tax.name[language]}</dt>
                            <dd>{money(tax.amount, language)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    {estimate.packageSaving > 0 && (
                      <p className="mt-2 text-sm font-semibold leading-6 text-teal-800">
                        {money(estimate.packageSaving, language)}{" "}
                        {t(
                          "saved per recurring standard visit, before tax and extras, compared with the same one-time package.",
                          "économisés par visite standard récurrente, avant taxes et options, par rapport au même forfait ponctuel.",
                        )}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      <strong>{frequencyLabel(selection, language)}</strong>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {money(estimate.monthly!, language)}{" "}
                      {t(
                        "average month before tax. Based on 52 weeks/year (26 biweekly visits or 12 monthly visits). First-visit-only extras and the initial rate difference are excluded.",
                        "par mois moyen avant taxes. Base de 52 semaines/an (26 visites aux deux semaines ou 12 visites mensuelles). Options de première visite et écart du tarif initial exclus.",
                      )}
                    </p>
                  </div>
                )}
                <p className="mt-5 text-sm leading-6 text-slate-600">
                  {t(
                    "This is a planning estimate, not an accepted quote. It assumes the profile and condition selected. We confirm scope, time, access and any agreed extras before work.",
                    "Cette estimation sert à prévoir votre budget ; ce n’est pas un devis accepté. Elle suppose le profil et l’état choisis. Nous confirmons périmètre, durée, accès et suppléments convenus avant le travail.",
                  )}
                </p>
              </>
            )}
            {!confirmation && (
              <Button
                onClick={book}
                className="mt-6 h-auto min-h-12 w-full whitespace-normal bg-teal-800 px-3 py-3 text-base text-white hover:bg-teal-900"
              >
                {estimate.requiresVisit
                  ? t("Book my free visit", "Réserver ma visite gratuite")
                  : t("Book now", "Réserver maintenant")}
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            )}
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              {t(
                "Sends a request for an official quote. No payment or automatic booking.",
                "Permet de demander un devis officiel. Aucun paiement ni réservation automatique.",
              )}
            </p>
            <Link
              to="/pricing-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-center text-sm font-medium text-teal-800 underline underline-offset-4"
            >
              {t("Pricing and quality policy", "Politique des prix et de la qualité")}
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
