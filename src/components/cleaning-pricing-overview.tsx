import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  Sparkles,
  Camera,
} from "lucide-react";
import { useLanguage } from "@/lib/language";
import {
  ADDONS,
  DEEP_TASKS,
  ROUTINE_TASKS,
  FREQUENCY_NOTE,
  SERVICE_AREA,
  initialSelection,
  money,
  packageExample,
  plansFor,
  type Audience,
  type PlanId,
} from "@/lib/cleaning-pricing";
import residentialPhoto from "@/assets/cleaning/residential-v5.webp";
import commercialPhoto from "@/assets/cleaning/commercial-v5.webp";

const container = "mx-auto max-w-6xl px-5 sm:px-8";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-teal-800 px-5 py-3 text-sm font-semibold text-teal-900 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800";

function useCopy() {
  const { language } = useLanguage();
  return { language, t: (en: string, fr: string) => (language === "fr" ? fr : en) };
}

function EstimateLink({
  audience,
  plan,
  children,
  secondary = false,
}: {
  audience: Audience;
  plan?: PlanId;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      to="/pricing/estimate"
      search={{ audience, plan: plan ?? initialSelection(audience).plan }}
      className={secondary ? secondaryButton : primaryButton}
    >
      {children}
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
    </Link>
  );
}

function ServicePhoto({
  audience,
  priority = false,
  className = "",
}: {
  audience: Audience;
  priority?: boolean;
  className?: string;
}) {
  const { t } = useCopy();
  return (
    <img
      src={audience === "residential" ? residentialPhoto : commercialPhoto}
      alt={
        audience === "residential"
          ? t(
              "Illustration of a cleaner wiping a kitchen island in a bright home",
              "Illustration d’une intervenante nettoyant un îlot de cuisine dans une maison lumineuse",
            )
          : t(
              "Illustration of a cleaner mopping the floor in a modern office",
              "Illustration d’une intervenante nettoyant le sol d’un bureau moderne",
            )
      }
      width={1536}
      height={1024}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`w-full object-cover ${className}`}
    />
  );
}

function QualityStrip() {
  const { t } = useCopy();
  return (
    <div className="grid gap-5 border-y border-slate-200 py-6 text-sm text-slate-700 sm:grid-cols-3">
      {[
        {
          Icon: Sparkles,
          text: t("Products & everyday equipment included", "Produits et matériel courant inclus"),
        },
        {
          Icon: ClipboardCheck,
          text: t("A checklist after every visit", "Une checklist après chaque visite"),
        },
        {
          Icon: Camera,
          text: t("Follow-up photos, with your permission", "Photos de suivi avec votre accord"),
        },
      ].map(({ Icon, text }) => (
        <p key={text} className="flex items-center gap-3">
          <Icon aria-hidden className="h-5 w-5 shrink-0 text-teal-700" />
          {text}
        </p>
      ))}
    </div>
  );
}

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-slate-200">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden
          className="h-5 w-5 shrink-0 text-teal-700 transition group-open:rotate-180"
        />
      </summary>
      <div className="pb-6 text-sm leading-7 text-slate-600">{children}</div>
    </details>
  );
}

function Process() {
  const { t } = useCopy();
  return (
    <section
      className="grid gap-7 py-12 sm:grid-cols-3 sm:py-16"
      aria-label={t("How it works", "Comment ça marche")}
    >
      {[
        [
          t("Choose your clean", "Choisissez votre nettoyage"),
          t(
            "A home or a workplace, with a service that fits.",
            "Un logement ou un lieu de travail, avec la prestation adaptée.",
          ),
        ],
        [
          t("Personalize your estimate", "Personnalisez votre estimation"),
          t(
            "Adjust your space, frequency and optional extras.",
            "Précisez l’espace, la fréquence et les options utiles.",
          ),
        ],
        [
          t("Receive your official quote", "Recevez votre devis officiel"),
          t(
            "We review the details with you before confirming the work.",
            "Nous vérifions les détails avec vous avant de confirmer la prestation.",
          ),
        ],
      ].map(([title, description], i) => (
        <div key={title} className="flex gap-4">
          <span className="pt-1 text-sm font-semibold text-teal-700">0{i + 1}</span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

// Display the existing four-visit policy for equal-scope packages, without taxes or extras.
// Derive the full rate from the standard plan so display values follow the price catalogue.
function recurringPackage(plan: ReturnType<typeof plansFor>[number], hours: number) {
  if (!["weekly", "biweekly", "monthly", "recurring"].includes(plan.id)) return null;
  const fullRate = plansFor("residential").find((item) => item.id === "once")!.rate!;
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const full = round(hours * fullRate);
  const following = round(hours * plan.rate!);
  const difference = round(full - following);
  const credit = round(3 * difference);
  const fourth = round(following - credit);
  return {
    fullRate,
    full,
    following,
    difference,
    credit,
    fourth,
    saving: round(4 * difference),
    total: round(3 * full + fourth),
    referenceTotal: round(4 * full),
  };
}

function RecurringCondition() {
  const { t } = useCopy();
  return (
    <p className="text-sm leading-6 text-slate-700">
      {t(
        "4 consecutive visits at the agreed frequency required. No credit if you stop before visit 4.",
        "4 visites consécutives à la fréquence convenue requises. Aucun crédit en cas d’arrêt avant la 4e visite.",
      )}
    </p>
  );
}

function PackageCalculation({ billing }: { billing: NonNullable<ReturnType<typeof recurringPackage>> }) {
  const { language, t } = useCopy();
  return (
    <details className="group mt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-teal-900 [&::-webkit-details-marker]:hidden">
        {t("Understand the calculation", "Comprendre le calcul")}
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-2 pb-2 text-sm leading-6 text-slate-700">
        <p>
          {t("Saving per visit:", "Économie par visite :")} {money(billing.full, language)} −{" "}
          {money(billing.following, language)} = {money(billing.difference, language)}.
        </p>
        <p>
          {t("Credit from visits 1–3:", "Crédit des visites 1 à 3 :")} 3 ×{" "}
          {money(billing.difference, language)} = {money(billing.credit, language)}.
        </p>
        <p>
          {t("Invoice 4:", "Facture 4 :")} {money(billing.following, language)} −{" "}
          {money(billing.credit, language)} = {money(billing.fourth, language)}.
        </p>
        <p>
          {t("Total for 4 visits:", "Total des 4 visites :")} {money(billing.total, language)}{" "}
          {t("instead of", "au lieu de")} {money(billing.referenceTotal, language)}.
        </p>
      </div>
    </details>
  );
}

export function PricingLanding() {
  const { language, t } = useCopy();
  return (
    <main data-i18n-ignore="true" className="bg-white text-slate-900">
      <div className={`${container} pt-12 sm:pt-16`}>
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
          Ottawa &amp; Gatineau
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t("A clean space.\nA simpler day.", "Un espace propre.\nUn quotidien plus simple.")}
          </h1>
          <p className="max-w-md text-base leading-7 text-slate-600">
            {t(
              "At home or at work, find your service, see our prices and make it your own.",
              "À la maison ou au travail, découvrez nos prestations, consultez les tarifs et composez votre nettoyage.",
            )}
          </p>
        </div>
        <div className="mt-9 grid gap-8 md:grid-cols-2">
          {(["residential", "commercial"] as const).map((audience) => {
            const residential = audience === "residential";
            const plan = plansFor(audience).find(
              (p) => p.id === (residential ? "weekly" : "recurring"),
            )!;
            const billing = recurringPackage(plan, plan.minimum)!;
            return (
              <Link
                key={audience}
                to={residential ? "/pricing/residential" : "/pricing/commercial"}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
              >
                <div className="overflow-hidden">
                  <ServicePhoto
                    audience={audience}
                    priority
                    className="aspect-[16/10] transition duration-500 motion-safe:group-hover:scale-[1.025]"
                  />
                </div>
                <div className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold">
                      {residential
                        ? t("For your home", "Pour votre maison")
                        : t("For your business", "Pour votre entreprise")}
                    </h2>
                    <ArrowRight aria-hidden className="h-6 w-6 text-teal-800" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {residential
                      ? t(
                          "Homes, apartments & condos. Routine or deep cleaning.",
                          "Maisons, appartements et condos. Entretien courant ou en profondeur.",
                        )
                      : t(
                          "Offices, shops & common areas. Cleaning that fits your schedule.",
                          "Bureaux, commerces et parties communes. Un entretien adapté à votre activité.",
                        )}
                  </p>
                  <p className="mt-5 text-base font-semibold text-teal-900">
                    {t("First visit from", "Première visite dès")} {money(billing.full, language)}{" "}
                    <span className="text-sm font-normal text-slate-600">
                      {t("before tax & extras", "avant taxes et options")}
                    </span>
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {plan.minimum} {t("worker-hours · one visit per week.", "heures-personnes · une visite par semaine.")}{" "}
                    {t("Visits 1–3 at full rate; credit on visit 4 after 4 consecutive visits.", "Visites 1 à 3 au tarif complet ; crédit à la 4e après 4 visites consécutives.")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-teal-900">
                    {t("Then from", "Ensuite dès")} {money(billing.following, language)}{" "}
                    {t("per visit, at the agreed frequency.", "par visite, selon la fréquence convenue.")}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800">
                    {t("Explore services & prices", "Voir les prestations et tarifs")}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {t("Illustrative images created with AI.", "Visuels d’illustration créés avec l’IA.")}
        </p>
        <Process />
        <QualityStrip />
        <div className="flex flex-wrap items-center justify-between gap-5 py-9 text-sm">
          <p className="flex items-center gap-2 text-slate-600">
            <MapPin aria-hidden className="h-4 w-4 shrink-0 text-teal-700" />
            {SERVICE_AREA[language]}
          </p>
          <Link
            to="/pricing-policy"
            className="font-semibold text-teal-800 underline underline-offset-4"
          >
            {t("Our pricing & quality policy", "Notre politique des prix et de la qualité")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function PackageCard({ audience, id }: { audience: Audience; id: PlanId }) {
  const { language, t } = useCopy();
  const plan = plansFor(audience).find((p) => p.id === id)!;
  const example = packageExample(plan)!;
  const commercialRecurring = id === "recurring";
  const billing = recurringPackage(plan, example.hours);
  const minimumBilling = commercialRecurring ? recurringPackage(plan, plan.minimum)! : null;
  return (
    <article
      data-package={id}
      className={`flex flex-col rounded-lg border p-6 sm:p-7 ${id === "weekly" || commercialRecurring ? "border-teal-700 bg-teal-50/60" : "border-slate-200 bg-white"}`}
    >
      <h3 className="min-h-14 text-lg font-semibold leading-7 text-slate-900">
        {plan.name[language]}
      </h3>
      <p className="mt-4 text-sm font-semibold text-slate-700">
        {billing ? t("Your first visit", "Votre première visite") : t("Per visit", "Par visite")}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {money(billing?.full ?? example.amount, language)}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {t("CAD before tax & extras", "CAD avant taxes et options")}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {example.hours.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")}{" "}
        {t("worker-hours / visit", "heures-personnes / visite")}
      </p>
      {billing ? (
        <>
          <dl className="mt-5 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white text-sm">
            {[
              { label: t("Visits 1–3 · each", "Visites 1 à 3 · chacune"), amount: billing.full },
              { label: t("Visit 4 · credit applied", "Visite 4 · crédit déduit"), amount: billing.fourth },
              { label: t("Visit 5 onward · each", "Dès la visite 5 · chacune"), amount: billing.following },
            ].map(({ label, amount }, index) => (
              <div key={label} className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-3 ${index === 1 ? "bg-teal-50 text-teal-950" : "text-slate-700"}`}>
                <dt className="min-w-0">{label}</dt>
                <dd className="shrink-0 font-bold tabular-nums">{money(amount, language)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm font-semibold leading-6 text-teal-900">
            {t("Save", "Économisez")} {money(billing.saving, language)}{" "}
            {t("over the first 4 visits.", "sur les 4 premières visites.")}
          </p>
          <div className="mt-2">
            <RecurringCondition />
          </div>
          <PackageCalculation billing={billing} />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">
            {money(plan.rate!, language)} {t("/ worker-hour", "/ heure-personne")}
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-600">
            {id === "deep"
              ? t("A more detailed clean", "Un nettoyage plus détaillé")
              : t("A fresh start, when you need it", "Un espace propre, selon vos besoins")}
          </p>
        </>
      )}
      <ul className="my-5 space-y-3 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
        {(id === "deep"
          ? [
              t("All routine cleaning tasks", "Toutes les tâches courantes"),
              t(
                "Baseboards, frames & detailed surfaces",
                "Plinthes, cadres et surfaces détaillées",
              ),
              t("Household grease & soap buildup", "Graisses et résidus de savon accumulés"),
            ]
          : audience === "residential"
            ? [
                t("Kitchen & bathroom surfaces", "Surfaces de cuisine et sanitaires"),
                t(
                  "Dusting, vacuuming & floor mopping",
                  "Dépoussiérage, aspiration et lavage des sols",
                ),
                t("Products & everyday equipment", "Produits et matériel courant"),
              ]
            : [
                t("Clear desks, reception & floors", "Bureaux dégagés, réception et sols"),
                t(
                  "Washrooms, kitchenette & on-site bins",
                  "Sanitaires, kitchenette et poubelles sur place",
                ),
                t("Products & everyday equipment", "Produits et matériel courant"),
              ]
        ).map((item) => (
          <li key={item} className="flex gap-2">
            <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
            {item}
          </li>
        ))}
      </ul>
      {minimumBilling && (
        <p className="mb-5 text-sm leading-6 text-slate-600">
          <strong className="font-semibold text-slate-800">
            {t("For the 2-worker-hour minimum:", "Pour le minimum de 2 heures-personnes :")}
          </strong>{" "}
          {t("visits 1–3", "visites 1 à 3")} {money(minimumBilling.full, language)}{" "}
          {t("each", "chacune")} ; {t("visit 4", "visite 4")} {money(minimumBilling.fourth, language)} ;{" "}
          {t("then", "puis")} {money(minimumBilling.following, language)} {t("per visit.", "par visite.")}
        </p>
      )}
      <div className="mt-auto">
        <EstimateLink audience={audience} plan={id} secondary={id !== "weekly" && !commercialRecurring}>
          {t("Get my free quote", "Obtenir mon devis gratuit")}
        </EstimateLink>
      </div>
    </article>
  );
}

function AllPlans({ audience }: { audience: Audience }) {
  const { language, t } = useCopy();
  return (
    <Disclosure
      title={t(
        "Compare all services and prices",
        "Comparer toutes les prestations et tous les tarifs",
      )}
    >
      <p className="mb-3 text-sm leading-6 text-slate-700">
        {t("CAD before tax and extras. Recurring packages show the amounts for each stage, for identical cleaning time and scope.", "CAD avant taxes et options. Les forfaits récurrents indiquent les montants à chaque étape, pour une durée et des prestations identiques.")}
      </p>
      <RecurringCondition />
      <div
        className="relative mt-3 overflow-x-auto"
        role="region"
        tabIndex={0}
        aria-label={t("All cleaning prices", "Tous les tarifs de nettoyage")}
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">
            {t("Prices in CAD before tax and extras", "Tarifs en CAD avant taxes et options")}
          </caption>
          <thead>
            <tr className="border-b text-slate-900">
              <th className="py-3 pr-4">{t("Service", "Prestation")}</th>
              <th className="p-3">{t("Per worker-hour", "Par heure-personne")}</th>
              <th className="p-3">{t("Package", "Forfait")}</th>
              <th>
                <span className="sr-only">{t("Choose", "Choisir")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plansFor(audience).map((plan) => {
              const example = packageExample(plan);
              const billing = example ? recurringPackage(plan, example.hours) : null;
              const minimumBilling = plan.id === "recurring" ? recurringPackage(plan, plan.minimum)! : null;
              return (
                <tr key={plan.id} className="border-b border-slate-100 align-top">
                  <td className="max-w-xs py-5 pr-5">
                    <p className="font-semibold text-slate-900">{plan.name[language]}</p>
                    <p className="mt-1 leading-6">{plan.description[language]}</p>
                  </td>
                  <td className="p-3 pt-5">
                    {billing ? (
                      <>
                        <p className="font-semibold text-slate-900">{money(billing.fullRate, language)}</p>
                        <p>{t("Visits 1–3", "Visites 1 à 3")}</p>
                        <p className="mt-2 font-semibold text-slate-900">{money(plan.rate!, language)}</p>
                        <p>{t("Recurring rate after qualification", "Tarif récurrent après admissibilité")}</p>
                      </>
                    ) : plan.id === "extras"
                      ? t("Per task", "Par tâche")
                      : plan.rate === null
                        ? t("Custom quote", "Sur devis")
                        : money(plan.rate, language)}
                  </td>
                  <td className="p-3 pt-5">
                    {example ? (
                      <>
                        {billing ? (
                          <div className="space-y-1 text-sm leading-6">
                            <p><strong className="text-slate-900">{money(billing.full, language)}</strong> · {t("visits 1–3, each", "visites 1 à 3, chacune")}</p>
                            <p className="font-medium text-teal-900">{money(billing.fourth, language)} · {t("visit 4, credit applied", "visite 4, crédit déduit")}</p>
                            <p>{money(billing.following, language)} · {t("visit 5 onward, each", "dès la visite 5, chacune")}</p>
                          </div>
                        ) : (
                          <strong className="text-slate-900">{money(example.amount, language)}</strong>
                        )}
                        <p className="mt-2 text-sm leading-6">
                          {plan.id === "extras"
                            ? t("Minimum total, tasks included", "Minimum total, tâches comprises")
                            : `${example.hours.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")} ${t("worker-hours / visit", "heures-personnes / visite")}`}
                        </p>
                        {billing && (
                          <p className="mt-2 font-semibold text-teal-900">
                            {t("Save", "Économisez")} {money(billing.saving, language)}{" "}
                            {t("over the first 4 visits", "sur les 4 premières visites")}
                          </p>
                        )}
                        {minimumBilling && (
                          <p className="mt-2 text-sm leading-6">
                            {t("2-hour minimum:", "Minimum de 2 h :")} {money(minimumBilling.full, language)}{" "}
                            {t("for each of visits 1–3;", "pour chacune des visites 1 à 3 ;")} {money(minimumBilling.fourth, language)}{" "}
                            {t("on visit 4; then", "à la visite 4 ; puis")} {money(minimumBilling.following, language)}{" "}
                            {t("per visit.", "par visite.")}
                          </p>
                        )}
                      </>
                    ) : plan.id === "flexible" ? (
                      t("Revised for your schedule", "Révisé selon la fréquence")
                    ) : (
                      t("Free site visit", "Visite gratuite")
                    )}
                  </td>
                  <td className="py-5 pl-3">
                    <Link
                      to="/pricing/estimate"
                      search={{ audience, plan: plan.id }}
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-teal-800 underline underline-offset-4"
                      aria-label={`${t("Choose", "Choisir")} ${plan.name[language]}`}
                    >
                      {t("Choose", "Choisir")}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Disclosure>
  );
}

function IncludedTasks({ audience }: { audience: Audience }) {
  const { language, t } = useCopy();
  return (
    <div>
      <Disclosure
        title={t("What is included in routine cleaning?", "Que comprend l’entretien courant ?")}
      >
        <ul className="space-y-3">
          {ROUTINE_TASKS.map((task) => (
            <li key={task.en} className="flex gap-2">
              <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
              {task[language]}
            </li>
          ))}
        </ul>
        {audience === "commercial" && (
          <p className="mt-4">
            {t(
              "Commercial service covers clear desks, reception, floors, washrooms, kitchenette and on-site bins. Paper, user soap and bin liners are client-supplied or quoted separately; restocking accessible dispensers is included.",
              "L’entretien commercial couvre bureaux dégagés, réception, sols, sanitaires, kitchenette et poubelles sur place. Papier, savon des usagers et sacs fournis par le client ou chiffrés séparément ; réapprovisionnement accessible inclus.",
            )}
          </p>
        )}
      </Disclosure>
      <Disclosure
        title={t("What does deep cleaning add?", "Qu’ajoute le nettoyage en profondeur ?")}
      >
        <p className="mb-3">
          {t("All routine tasks, plus:", "Toutes les tâches courantes, auxquelles s’ajoutent :")}
        </p>
        <ul className="space-y-3">
          {DEEP_TASKS.map((task) => (
            <li key={task.en} className="flex gap-2">
              <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
              {task[language]}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          {t(
            "Appliance interiors and window glass are extra unless included in your written quote. We never charge twice for an included task.",
            "L’intérieur des appareils et les vitres sont en supplément, sauf inclusion au devis. Une tâche déjà comprise n’est jamais facturée deux fois.",
          )}
        </p>
      </Disclosure>
    </div>
  );
}

function AddonCatalogue({ audience }: { audience: Audience }) {
  const { language, t } = useCopy();
  return (
    <section id="extras" className="scroll-mt-28 border-t border-slate-200 py-12 sm:py-16">
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
            {t("Optional extras", "Services supplémentaires")}
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            {t("The details make a difference.", "Les petits détails font la différence.")}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {t(
              "Add only what you need. Each option has a clear price and scope. In your estimate, choose First visit only or Every visit for recurring cleaning.",
              "Ajoutez seulement ce qui vous est utile. Chaque option précise son prix et son contenu. Pour un entretien récurrent, choisissez Première visite seulement ou À chaque visite dans le calculateur.",
            )}
          </p>
          <p className="mt-4 text-sm font-semibold text-teal-800">
            {t(
              "Fridge + oven: $65 instead of $70 separately.",
              "Réfrigérateur + four : 65 $ au lieu de 70 $ séparément.",
            )}
          </p>
        </div>
        <div>
          {(["kitchen", "rooms", "detail"] as const).map((group) => (
            <Disclosure
              key={group}
              title={
                group === "kitchen"
                  ? t("Kitchen & appliances", "Cuisine et appareils")
                  : group === "rooms"
                    ? t("Rooms, linen & tidying", "Pièces, linge et rangement")
                    : t("Windows, garage & detailed tasks", "Vitres, garage et tâches détaillées")
              }
            >
              <dl className="divide-y divide-slate-100">
                {ADDONS.filter(
                  (a) => a.group === group && (!a.residentialOnly || audience === "residential"),
                ).map((a) => (
                  <div key={a.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <dt className="font-semibold text-slate-900">{a.name[language]}</dt>
                      <dd className="font-semibold text-teal-800">
                        {money(a.price, language)} / {a.unit[language]}
                      </dd>
                    </div>
                    <dd className="mt-1 leading-6">{a.scope[language]}</dd>
                    {a.deepPrice !== undefined && (
                      <dd className="mt-1 text-xs font-medium">
                        {t("With a deep clean:", "Avec un nettoyage en profondeur :")}{" "}
                        {money(a.deepPrice, language)} / {a.unit[language]}
                      </dd>
                    )}
                    {a.includedInDeep && (
                      <dd className="mt-1 text-xs font-medium text-teal-800">
                        {t(
                          "Already included in deep cleaning.",
                          "Déjà compris dans le nettoyage en profondeur.",
                        )}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </Disclosure>
          ))}
          <p className="mt-4 text-xs leading-6 text-slate-500">
            {t(
              "CAD before tax. Add-ons-only visits have a $150 minimum total, including selected tasks. Above listed limits: quote after a free site visit.",
              "CAD avant taxes. Une visite pour options seules comporte un minimum total de 150 $, tâches choisies comprises. Au-delà des limites indiquées : devis après visite gratuite.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export function CleaningPricingPage({ audience }: { audience: Audience }) {
  const { language, t } = useCopy();
  const residential = audience === "residential";
  const featured: PlanId[] = residential
    ? ["weekly", "biweekly", "monthly"]
    : ["recurring", "once", "deep"];
  return (
    <main data-i18n-ignore="true" className="bg-white text-slate-900">
      <div className={container}>
        <nav
          aria-label={t("Cleaning services", "Prestations de nettoyage")}
          className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-200 py-5 text-sm"
        >
          <Link
            to="/pricing"
            className="w-full text-slate-600 hover:text-teal-800 sm:mr-auto sm:w-auto"
          >
            {t("All cleaning services", "Toutes les prestations")}
          </Link>
          <Link
            to="/pricing/residential"
            aria-current={residential ? "page" : undefined}
            className={
              residential
                ? "font-semibold text-teal-800 underline underline-offset-8"
                : "text-slate-600 hover:text-teal-800"
            }
          >
            {t("Residential", "Résidentiel")}
          </Link>
          <Link
            to="/pricing/commercial"
            aria-current={!residential ? "page" : undefined}
            className={
              !residential
                ? "font-semibold text-teal-800 underline underline-offset-8"
                : "text-slate-600 hover:text-teal-800"
            }
          >
            {t("Commercial", "Commercial")}
          </Link>
        </nav>
        <section className="grid items-center gap-8 py-9 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
              {t("Cleaning in Ottawa & Gatineau", "Nettoyage à Ottawa et Gatineau")}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {residential
                ? t(
                    "Home cleaning,\nmade simple.",
                    "Le nettoyage résidentiel,\nen toute simplicité.",
                  )
                : t(
                    "A cleaner space\nfor your business.",
                    "Un espace plus propre\npour votre entreprise.",
                  )}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              {residential
                ? t(
                    "Enjoy your home. We take care of the cleaning, from a regular refresh to the details that need a little more attention.",
                    "Profitez de votre maison. Nous nous occupons du ménage, de l’entretien régulier aux détails qui demandent plus d’attention.",
                  )
                : t(
                    "Give your team and visitors a well-kept workplace. Clear services, flexible schedules and a quote that fits your space.",
                    "Accueillez votre équipe et vos visiteurs dans des locaux soignés. Des prestations claires, des horaires adaptés et un devis à votre mesure.",
                  )}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#plans" className={primaryButton}>
                {t("Explore our plans", "Découvrir les forfaits")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
              <EstimateLink audience={audience} secondary>
                {t("Get my estimate", "Calculer mon estimation")}
              </EstimateLink>
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              {t(
                "Free official quote · no payment to get started",
                "Devis officiel gratuit · aucun paiement pour commencer",
              )}
            </p>
          </div>
          <figure>
            <ServicePhoto audience={audience} priority className="aspect-[4/3] rounded-lg" />
            <figcaption className="mt-2 text-right text-xs text-slate-500">
              {t("AI-created service illustration", "Illustration du service créée avec l’IA")}
            </figcaption>
          </figure>
        </section>
        <QualityStrip />
        <section id="plans" className="scroll-mt-28 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
              {t("Services & prices", "Prestations et tarifs")}
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              {residential
                ? t("A rhythm that works for you.", "Le rythme qui vous convient.")
                : t("The right clean for your workplace.", "Le bon entretien pour vos locaux.")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {t(
                "Reference packages in CAD, before tax and extras. Products and everyday equipment included. Your final estimate adjusts to your space.",
                "Forfaits de référence en CAD, avant taxes et options. Produits et matériel courant inclus. Votre estimation s’adapte à votre espace.",
              )}
            </p>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {featured.map((id) => (
              <PackageCard key={id} audience={audience} id={id} />
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            {t(
              "Four-visit savings compare 4 identical visits at the full standard rate. The credit changes the price, not the agreed cleaning tasks.",
              "Les économies sur 4 visites se comparent à 4 prestations identiques au tarif standard complet. Le crédit modifie le prix, pas les tâches convenues.",
            )}
          </p>
          <AllPlans audience={audience} />
          <div className="mt-7 flex flex-col justify-between gap-5 rounded-lg bg-teal-50 px-6 py-6 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <h3 className="font-semibold text-teal-950">
                {t("More than one visit a week?", "Plus d’une visite par semaine ?")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{FREQUENCY_NOTE[language]}</p>
            </div>
            <EstimateLink audience={audience} plan="flexible" secondary>
              {t("Tailor my schedule", "Adapter ma fréquence")}
            </EstimateLink>
          </div>
        </section>
        <section className="grid gap-8 border-t border-slate-200 py-12 sm:py-16 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
              {t("What we take care of", "Ce que nous prenons en charge")}
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              {t(
                "Clear services.\nThoughtful details.",
                "Des prestations claires.\nDes détails soignés.",
              )}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {t(
                "See the full checklist for your service. A worker-hour means one person working for one hour; two people for 1.5 hours equals 3 worker-hours.",
                "Consultez le détail de votre prestation. Une heure-personne correspond à une personne pendant une heure ; deux personnes pendant 1,5 h correspondent à 3 heures-personnes.",
              )}
            </p>
          </div>
          <IncludedTasks audience={audience} />
        </section>
        <AddonCatalogue audience={audience} />
        <section className="mb-12 rounded-lg bg-teal-950 p-7 text-white sm:mb-16 sm:p-10">
          <div className="grid items-center gap-7 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                {t("Ready for a fresh start?", "Prêt pour un espace plus propre ?")}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-teal-50">
                {t(
                  "Choose your service and get a provisional estimate. Photos help us prepare an accurate quote, but are always optional.",
                  "Choisissez votre prestation et obtenez une estimation provisoire. Des photos nous aident à préciser le devis, mais restent facultatives.",
                )}
              </p>
            </div>
            <Link
              to="/pricing/estimate"
              search={{ audience, plan: initialSelection(audience).plan }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-teal-950 hover:bg-teal-50"
            >
              {t("Book now", "Réserver maintenant")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 border-t border-white/20 pt-5 text-xs leading-6 text-teal-50">
            <p>
              {t(
                "Heavy post-construction cleaning, mould, flood damage or specialist equipment: a free on-site visit is required before a precise quote.",
                "Gros travaux de construction, moisissures, inondations ou matériel spécialisé : une visite gratuite sur place est nécessaire avant un devis précis.",
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <EstimateLinkOnDark audience={audience} />
              <Link
                to="/pricing-policy"
                className="font-semibold text-white underline underline-offset-4"
              >
                {t("Pricing & quality policy", "Politique des prix et de la qualité")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function EstimateLinkOnDark({ audience }: { audience: Audience }) {
  const { t } = useCopy();
  return (
    <Link
      to="/pricing/estimate"
      search={{ audience, plan: "specialist" }}
      className="font-semibold text-white underline underline-offset-4"
    >
      {t("Request a free site visit", "Demander une visite gratuite")}
    </Link>
  );
}
