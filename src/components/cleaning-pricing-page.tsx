import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { CleaningQuoteRequest } from "@/components/cleaning-quote-request";
import {
  ADDONS,
  BUSINESS_PROFILES,
  DEEP_TASKS,
  HOME_PROFILES,
  ROUTINE_TASKS,
  addonPrice,
  calculateCleaningEstimate,
  initialSelection,
  money,
  plansFor,
  type Audience,
  type PlanId,
  type PricingSelection,
} from "@/lib/cleaning-pricing";

export function PricingLanding() {
  const { language } = useLanguage();
  const fr = language === "fr";
  return (
    <main data-i18n-ignore="true" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
        {fr ? "Tarifs de nettoyage" : "Cleaning prices"}
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">
        {fr ? "Le bon nettoyage, au prix clair." : "The right clean. A clear price."}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
        {fr
          ? "Choisissez votre espace, découvrez ce qui est inclus et composez votre estimation. Produits et matériel courant compris."
          : "Choose your space, see what is included and build your estimate. Cleaning products and everyday equipment included."}
      </p>
      <div className="mt-9 grid gap-5 md:grid-cols-2">
        {(["residential", "commercial"] as const).map((kind) => {
          const residential = kind === "residential";
          const Icon = residential ? Home : Building2;
          return (
            <Link
              key={kind}
              to={residential ? "/pricing/residential" : "/pricing/commercial"}
              className="group flex flex-col rounded-2xl border border-teal-100 bg-white p-7 shadow-sm transition hover:border-teal-500 hover:shadow-md sm:p-9"
            >
              <Icon aria-hidden className="h-9 w-9 text-teal-800" />
              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {residential
                  ? fr
                    ? "Résidentiel"
                    : "Residential"
                  : fr
                    ? "Commercial"
                    : "Commercial"}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {residential
                  ? fr
                    ? "Maisons, appartements et condos. Entretien régulier, ponctuel ou en profondeur."
                    : "Homes, apartments and condos. Recurring, one-time or deep cleaning."
                  : fr
                    ? "Bureaux, commerces et parties communes. Une fréquence adaptée à votre activité."
                    : "Offices, shops and common areas. A schedule that fits your business."}
              </p>
              <div className="mt-7 text-3xl font-bold text-slate-900">
                {money(45, language)}
                <span className="ml-2 text-base font-normal text-slate-600">
                  {fr ? "/ heure-personne" : "/ worker-hour"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {residential
                  ? fr
                    ? "Entretien récurrent dès 135 $ par visite. Première visite au tarif ponctuel."
                    : "Recurring maintenance from $135 per visit. Initial visit at the one-time rate."
                  : fr
                    ? "Entretien récurrent dès 90 $ par visite. Périmètre confirmé au devis."
                    : "Recurring maintenance from $90 per visit. Scope confirmed in your quote."}
              </p>
              <span className="mt-7 inline-flex items-center gap-2 font-semibold text-teal-800">
                {fr ? "Voir les tarifs et estimer" : "See prices and estimate"}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-slate-600">
        {fr
          ? "Dollars canadiens, avant taxes. Une heure-personne = le travail d’une personne pendant une heure."
          : "Canadian dollars, before tax. A worker-hour means one person working for one hour."}
      </p>
      <QualityNotes />
      <div className="mt-10 border-t pt-7 text-sm leading-7 text-slate-600">
        {fr
          ? "Besoin d’un service spécialisé ? Une visite gratuite permet de préparer un devis précis."
          : "Need specialist cleaning? A free on-site visit helps us prepare an accurate quote."}{" "}
        <Link
          to="/pricing-policy"
          className="font-semibold text-teal-800 underline underline-offset-4"
        >
          {fr ? "Lire notre politique des prix" : "Read our pricing policy"}
        </Link>
      </div>
    </main>
  );
}

export function QualityNotes() {
  const { language } = useLanguage();
  const fr = language === "fr";
  return (
    <div className="mt-8 grid gap-4 text-sm font-medium text-slate-700 sm:grid-cols-3">
      {[
        [Sparkles, fr ? "Produits et matériel inclus" : "Products and equipment included"],
        [ClipboardCheck, fr ? "Checklist après chaque visite" : "Checklist after every visit"],
        [Camera, fr ? "Photos avec votre accord" : "Photos with your permission"],
      ].map(([Icon, label]) => {
        const I = Icon as typeof Sparkles;
        return (
          <div key={String(label)} className="flex items-center gap-3">
            <I aria-hidden className="h-5 w-5 shrink-0 text-teal-700" />
            {label as string}
          </div>
        );
      })}
    </div>
  );
}

export function CleaningPricingPage({ audience }: { audience: Audience }) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [selection, setSelection] = useState<PricingSelection>(() => initialSelection(audience));
  const [checkout, setCheckout] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string; missingPhotos: boolean } | null>(
    null,
  );
  const calculator = useRef<HTMLElement>(null),
    contact = useRef<HTMLElement>(null);
  const estimate = useMemo(() => calculateCleaningEstimate(selection), [selection]);
  const residential = audience === "residential",
    profiles = residential ? HOME_PROFILES : BUSINESS_PROFILES;
  const update = <K extends keyof PricingSelection>(key: K, value: PricingSelection[K]) =>
    setSelection((s) => ({ ...s, [key]: value }));
  const selectPlan = (plan: PlanId) => {
    update("plan", plan);
    calculator.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const book = () => {
    setCheckout(true);
    setTimeout(() => contact.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const area = profiles.find((p) => p.id === selection.profile)?.area ?? 0;
  const planList = plansFor(audience);
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
    <main data-i18n-ignore="true" className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
      <nav
        aria-label={t("Pricing navigation", "Navigation des tarifs")}
        className="mb-6 flex flex-wrap gap-3 text-sm"
      >
        <Link to="/pricing" className="text-teal-800 underline underline-offset-4">
          {t("Cleaning prices", "Tarifs de nettoyage")}
        </Link>
        <span aria-hidden>/</span>
        <span>{residential ? t("Residential", "Résidentiel") : t("Commercial", "Commercial")}</span>
        <Link
          className="ml-auto text-teal-800 underline underline-offset-4"
          to={residential ? "/pricing/commercial" : "/pricing/residential"}
        >
          {residential
            ? t("Looking for commercial cleaning?", "Besoin de nettoyage commercial ?")
            : t("Looking for residential cleaning?", "Besoin de nettoyage résidentiel ?")}
        </Link>
      </nav>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {residential
              ? t("Residential cleaning prices", "Tarifs de nettoyage résidentiel")
              : t("Commercial cleaning prices", "Tarifs de nettoyage commercial")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {t(
              "Choose your service, add the details that matter and see your provisional estimate. No payment is needed to request an official quote.",
              "Choisissez votre prestation et les options utiles pour voir votre estimation provisoire. Aucun paiement n’est nécessaire pour demander un devis officiel.",
            )}
          </p>
        </div>
        <Button
          className="h-12 shrink-0 bg-teal-800 px-6 text-white hover:bg-teal-900"
          onClick={() => calculator.current?.scrollIntoView({ behavior: "smooth" })}
        >
          {t("Build my estimate", "Calculer mon estimation")}
        </Button>
      </div>
      <QualityNotes />
      <div
        className="relative mt-8 overflow-x-auto rounded-xl border bg-white"
        role="region"
        aria-label={t("Cleaning pricing table", "Tableau des tarifs de nettoyage")}
        tabIndex={0}
      >
        <table className="w-full min-w-[680px] text-left text-sm">
          <caption className="sr-only">
            {t(
              "Prices in CAD before tax, per worker-hour",
              "Prix en CAD avant taxes, par heure-personne",
            )}
          </caption>
          <thead className="bg-teal-900 text-white">
            <tr>
              <th className="p-4">
                {t("Plan and included service", "Forfait et prestation comprise")}
              </th>
              <th className="p-4">{t("Rate per worker-hour", "Tarif par heure-personne")}</th>
              <th className="p-4">{t("Minimum per visit", "Minimum par visite")}</th>
              <th className="p-4">
                <span className="sr-only">{t("Select", "Choisir")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {planList.map((plan) => {
              const reduced = plan.rate !== null && plan.rate > 0 && plan.rate < 50;
              const minimum =
                audience === "commercial" && plan.id === "recurring" ? 2 : plan.minimum;
              return (
                <tr key={plan.id} className="border-t align-top">
                  <td className="p-4">
                    <span className="block font-semibold text-slate-900">
                      {plan.name[language]}
                    </span>
                    <span className="mt-1 block max-w-sm leading-6 text-slate-600">
                      {plan.description[language]}
                    </span>
                  </td>
                  <td className="p-4">
                    {plan.id === "extras" ? (
                      <span className="font-semibold">
                        {t("Per selected task", "Par tâche choisie")}
                      </span>
                    ) : plan.rate === null ? (
                      <span className="font-semibold">{t("Custom quote", "Sur devis")}</span>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-baseline gap-2">
                          {reduced && (
                            <s
                              className="text-slate-500"
                              aria-label={t(
                                "One-time standard rate: $50",
                                "Tarif standard ponctuel : 50 $",
                              )}
                            >
                              {money(50, language)}
                            </s>
                          )}
                          <span className="text-xl font-bold text-slate-900">
                            {money(plan.rate, language)}
                          </span>
                          {reduced && (
                            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                              −{Math.round(((50 - plan.rate) / 50) * 100)} %
                            </span>
                          )}
                        </div>
                        {reduced && (
                          <p className="mt-1 max-w-[200px] text-xs leading-5 text-slate-600">
                            {t(
                              "Compared with our one-time standard hourly rate.",
                              "Par rapport à notre tarif horaire standard ponctuel.",
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="p-4">
                    {plan.rate === null ? (
                      t("Free site visit", "Visite gratuite")
                    ) : (
                      <>
                        <span className="block font-semibold">
                          {money(plan.id === "extras" ? 150 : plan.rate * minimum, language)}
                        </span>
                        <span className="text-slate-500">
                          {plan.id === "extras"
                            ? t("selected tasks included", "tâches choisies comprises")
                            : `${minimum.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")} ${t("worker-hours", "heures-personnes")}`}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="outline"
                      onClick={() => selectPlan(plan.id)}
                      aria-label={`${t("Select", "Choisir")} ${plan.name[language]}`}
                    >
                      {t("Select", "Choisir")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 sm:hidden">
        {t(
          "Swipe the table sideways to see all prices and select a plan.",
          "Faites glisser le tableau pour voir tous les prix et choisir un forfait.",
        )}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {t(
          "CAD before taxes. Products and everyday equipment included. Worker-hours are the total work of the team, not elapsed time.",
          "CAD avant taxes. Produits et matériel courant inclus. Les heures-personnes représentent le travail total de l’équipe, pas le temps écoulé.",
        )}
        {residential
          ? " " +
            t(
              "Recurring rates begin at the second visit; the initial visit uses the one-time rate unless a deep clean is agreed.",
              "Les tarifs récurrents commencent à la deuxième visite ; la première est au tarif ponctuel, sauf nettoyage en profondeur convenu.",
            )
          : ""}
      </p>
      <details className="mt-5 rounded-xl border bg-white p-5">
        <summary className="cursor-pointer font-semibold text-slate-900">
          {t("See exactly what is included", "Voir le détail des prestations incluses")}
        </summary>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-semibold">{t("Standard cleaning", "Nettoyage standard")}</h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              {ROUTINE_TASKS.map((item) => (
                <li key={item.en} className="flex gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
                  {item[language]}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">
              {t("Deep cleaning adds", "Le nettoyage en profondeur ajoute")}
            </h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              {DEEP_TASKS.map((item) => (
                <li key={item.en} className="flex gap-2">
                  <Plus className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
                  {item[language]}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {t(
                "Appliance interiors, window glass and the options below are extra unless included in your written quote. We never charge twice for the same task.",
                "Intérieurs des appareils, vitres et options ci-dessous en supplément, sauf inclusion au devis. Une même tâche n’est jamais facturée deux fois.",
              )}
            </p>
            {!residential && (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t(
                  "Commercial service covers clear desks, reception, floors, washrooms, kitchenette and on-site bins. Paper, user soap and bin liners are client-supplied or quoted separately; restocking accessible dispensers is included.",
                  "L’entretien commercial couvre bureaux dégagés, réception, sols, sanitaires, kitchenette et poubelles sur place. Papier, savon des usagers et sacs fournis par le client ou chiffrés séparément ; réapprovisionnement accessible inclus.",
                )}
              </p>
            )}
          </div>
        </div>
      </details>

      <section ref={calculator} id="estimate" className="mt-12 scroll-mt-28">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("Build your cleaning estimate", "Composez votre estimation")}
        </h2>
        <p className="mt-2 text-slate-600">
          {t(
            "Your choices stay visible as the estimate updates.",
            "L’estimation se met à jour au fil de vos choix.",
          )}
        </p>
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
                    <option value="Ontario">Ontario</option>
                    <option value="Quebec">Québec</option>
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
                {!residential && selection.plan === "recurring" && (
                  <label className="grid gap-2 text-sm font-medium">
                    {t("Visits per week", "Passages par semaine")}
                    <select
                      className="min-h-11 rounded-lg border bg-white px-3"
                      value={selection.visitsPerWeek}
                      onChange={(e) => update("visitsPerWeek", Number(e.target.value))}
                    >
                      {[1, 2, 3, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
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
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-teal-50 p-3 text-sm">
                <Sparkles className="h-5 w-5 text-teal-800" />
                <span>
                  {t("Fridge + oven", "Réfrigérateur + four")}{" "}
                  <s className="mx-1 text-slate-500">{money(70, language)}</s>{" "}
                  <strong>{money(65, language)}</strong> ·{" "}
                  {t("$5 bundle saving", "5 $ d’économie en forfait")}
                </span>
              </div>
              {(["kitchen", "rooms", "detail"] as const).map((group, i) => (
                <details key={group} className="mt-4 border-t pt-4" open={i === 0}>
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
            {estimate.requiresVisit ? (
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-900">
                  {t("Let’s assess your space", "Évaluons vos besoins sur place")}
                </h3>
                <p className="mt-4 leading-7 text-slate-600">
                  {t(
                    "A free on-site visit is needed to confirm the work and provide a precise quote. Your selected options will be sent with your request.",
                    "Une visite gratuite est nécessaire pour confirmer les travaux et fournir un devis précis. Vos options seront transmises avec la demande.",
                  )}
                </p>
                <p className="mt-4 font-semibold text-teal-800">
                  {t(
                    "Free assessment · no payment now",
                    "Visite gratuite · aucun paiement maintenant",
                  )}
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
                      {t(
                        "Following visits with these options",
                        "Visites suivantes avec ces options",
                      )}
                    </p>
                    <p className="mt-1 text-xl font-bold text-teal-800">
                      {money(estimate.subsequentTotal, language)}{" "}
                      <span className="text-sm font-normal">
                        {t("incl. tax / visit", "TTC / visite")}
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {money(estimate.monthly!, language)}{" "}
                      {t(
                        "average month before tax. Based on 52 weeks/year (26 biweekly visits or 12 monthly visits); initial visit differences excluded.",
                        "par mois moyen avant taxes. Base de 52 semaines/an (26 visites aux deux semaines ou 12 visites mensuelles) ; écart de première visite exclu.",
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
