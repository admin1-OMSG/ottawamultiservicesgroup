/** Public estimates only. Official quotes are reviewed and issued through the CRM. */
export const PRICING_VERSION = "2026-09-20-v10";
export type Locale = "en" | "fr";
export type Audience = "residential" | "commercial";
export type PlanId =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "once"
  | "deep"
  | "recurring"
  | "flexible"
  | "extras"
  | "specialist";
export type Copy = { en: string; fr: string };
export const text = (en: string, fr: string): Copy => ({ en, fr });
export const money = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const PLANS: {
  id: PlanId;
  name: Copy;
  rate: number | null;
  minimum: number;
  description: Copy;
}[] = [
  {
    id: "weekly",
    name: text("Once a week", "1 visite par semaine"),
    rate: 42,
    minimum: 3,
    description: text(
      "Routine cleaning, one visit every 7 days (52 visits/year).",
      "Entretien courant, une visite tous les 7 jours (52 visites/an).",
    ),
  },
  {
    id: "biweekly",
    name: text("Once every 2 weeks", "1 visite toutes les 2 semaines"),
    rate: 45,
    minimum: 3,
    description: text(
      "Routine cleaning, one visit every 14 days (26 visits/year).",
      "Entretien courant, une visite tous les 14 jours (26 visites/an).",
    ),
  },
  {
    id: "monthly",
    name: text("Monthly", "Chaque mois"),
    rate: 48,
    minimum: 3,
    description: text("Routine cleaning, once a month.", "Entretien courant, une fois par mois."),
  },
  {
    id: "recurring",
    name: text("Scheduled commercial cleaning", "Entretien commercial récurrent"),
    rate: 45,
    minimum: 2,
    description: text(
      "Reference rate for one visit per week. Other weekly frequencies receive a revised quote.",
      "Tarif de référence pour une visite par semaine. Autres fréquences hebdomadaires : tarif révisé au devis.",
    ),
  },
  {
    id: "flexible",
    name: text(
      "Multiple visits per week / custom schedule",
      "Plusieurs visites par semaine / sur mesure",
    ),
    rate: null,
    minimum: 0,
    description: text(
      "Two or more visits a week, or another schedule. Price reviewed for your frequency and tasks.",
      "Deux visites par semaine ou plus, ou un autre rythme. Prix révisé selon la fréquence et les tâches.",
    ),
  },
  {
    id: "once",
    name: text("One-time standard", "Nettoyage standard ponctuel"),
    rate: 50,
    minimum: 3,
    description: text(
      "The routine checklist for a single visit.",
      "Les tâches courantes pour une seule visite.",
    ),
  },
  {
    id: "deep",
    name: text("Deep cleaning", "Nettoyage en profondeur"),
    rate: 55,
    minimum: 4.5,
    description: text(
      "Routine tasks plus detailed surfaces and buildup.",
      "Tâches courantes, surfaces détaillées et saleté accumulée.",
    ),
  },
  {
    id: "extras",
    name: text("Add-ons only", "Options seules"),
    rate: 0,
    minimum: 0,
    description: text(
      "Selected tasks only; $150 minimum total per visit.",
      "Uniquement les tâches choisies ; minimum total de 150 $ par visite.",
    ),
  },
  {
    id: "specialist",
    name: text("Specialist or custom service", "Service spécialisé ou sur mesure"),
    rate: null,
    minimum: 0,
    description: text(
      "Free on-site assessment before a precise quote.",
      "Visite gratuite sur site avant un devis précis.",
    ),
  },
];
export const plansFor = (audience: Audience) =>
  PLANS.filter((p) =>
    (audience === "residential"
      ? ["weekly", "biweekly", "monthly", "flexible", "once", "deep", "extras", "specialist"]
      : ["recurring", "flexible", "once", "deep", "extras", "specialist"]
    ).includes(p.id),
  );

export const SERVICE_AREA = text(
  "Serving Ottawa & Gatineau · usual urban travel included",
  "Ottawa et Gatineau desservies · déplacement urbain habituel inclus",
);
export const FREQUENCY_NOTE = text(
  "Need two or more visits a week, daily service or another schedule? Other frequencies are available, with the price reviewed for the number of visits, tasks and time required. Request your tailored quote.",
  "Besoin de deux visites par semaine ou plus, d’un entretien quotidien ou d’un autre rythme ? D’autres fréquences sont possibles, avec un tarif révisé selon le nombre de passages, les tâches et la durée nécessaire. Demandez votre forfait personnalisé.",
);

export const RECURRING_CONDITION = text(
  "The recurring rate requires 4 consecutive completed visits at the agreed frequency. Visits 1, 2 and 3 are invoiced at the full standard rate. Once visit 4 is completed, its invoice uses the recurring rate and deducts the accumulated difference from the first 3 visits. The recurring rate then applies to subsequent visits while the agreed frequency is maintained. If fewer than 4 consecutive visits are completed, no recurring-rate credit is earned. Extras remain separately priced; the credit applies to eligible routine cleaning only. Any change of scope or schedule is confirmed in the official quote.",
  "Le tarif récurrent est accordé après 4 visites consécutives réalisées selon la fréquence convenue. Les visites 1, 2 et 3 sont facturées au tarif standard complet. Une fois la 4e visite réalisée, sa facture applique le tarif récurrent et déduit l’écart cumulé des 3 premières visites. Le tarif récurrent s’applique ensuite aux visites suivantes tant que la fréquence convenue est respectée. Si moins de 4 visites consécutives sont réalisées, aucun crédit de récurrence n’est acquis. Les suppléments restent facturés séparément ; le crédit concerne uniquement l’entretien courant admissible. Tout changement de périmètre ou de fréquence est confirmé au devis officiel.",
);
export const RECURRING_SHORT = text(
  "Recurring rate: 4 consecutive visits required. First 3 visits at full rate; the accumulated difference is credited on invoice 4.",
  "Tarif récurrent : 4 visites consécutives requises. Les 3 premières au tarif complet ; l’écart cumulé est déduit de la 4e facture.",
);

// Comparisons use the same scope and duration and respect the one-time minimum.
export const packageSaving = (hours: number, rate: number) =>
  hours >= 3 && rate > 0 && rate < 50 ? round(hours * (50 - rate)) : 0;
export function packageExample(plan: (typeof PLANS)[number]) {
  if (plan.rate === null) return null;
  const hours = plan.id === "recurring" ? 3 : plan.minimum;
  const amount = plan.id === "extras" ? 150 : round(hours * plan.rate);
  const saving = packageSaving(hours, plan.rate);
  return {
    hours,
    amount,
    saving,
    reference: round(amount + saving),
    minimum: plan.id === "extras" ? 150 : round(plan.minimum * plan.rate),
  };
}

export const HOME_PROFILES = [
  {
    id: "small",
    label: text(
      "Studio / 1 bedroom · 1 bathroom · up to 750 sq. ft.",
      "Studio / 1 chambre · 1 salle de bain · jusqu’à 750 pi²",
    ),
    hours: 3,
    deepHours: 4.5,
    area: 750,
  },
  {
    id: "two",
    label: text(
      "2 bedrooms · 1 bathroom · up to 1,100 sq. ft.",
      "2 chambres · 1 salle de bain · jusqu’à 1 100 pi²",
    ),
    hours: 3.5,
    deepHours: 5.5,
    area: 1100,
  },
  {
    id: "three",
    label: text(
      "3 bedrooms · 1.5 bathrooms · up to 1,500 sq. ft.",
      "3 chambres · 1,5 salle de bain · jusqu’à 1 500 pi²",
    ),
    hours: 4,
    deepHours: 6.5,
    area: 1500,
  },
  {
    id: "large",
    label: text(
      "3 bedrooms · 2.5 bathrooms · up to 2,000 sq. ft.",
      "3 chambres · 2,5 salles de bain · jusqu’à 2 000 pi²",
    ),
    hours: 5,
    deepHours: 7.5,
    area: 2000,
  },
  {
    id: "four",
    label: text(
      "4 bedrooms · 3 bathrooms · up to 2,500 sq. ft.",
      "4 chambres · 3 salles de bain · jusqu’à 2 500 pi²",
    ),
    hours: 6,
    deepHours: 9,
    area: 2500,
  },
  {
    id: "custom",
    label: text("Larger home or different layout", "Plus grand logement ou autre configuration"),
    hours: 0,
    deepHours: 0,
    area: 0,
  },
];
export const BUSINESS_PROFILES = [
  {
    id: "small",
    label: text(
      "Up to 1,000 sq. ft. · up to 10 workstations / 2 toilets",
      "Jusqu’à 1 000 pi² · 10 postes / 2 WC maximum",
    ),
    hours: 2,
    area: 1000,
  },
  {
    id: "medium",
    label: text(
      "1,001–2,500 sq. ft. · up to 25 workstations / 2 toilets",
      "1 001–2 500 pi² · 25 postes / 2 WC maximum",
    ),
    hours: 3.5,
    area: 2500,
  },
  {
    id: "large",
    label: text(
      "2,501–4,000 sq. ft. · up to 40 workstations / 4 toilets",
      "2 501–4 000 pi² · 40 postes / 4 WC maximum",
    ),
    hours: 5,
    area: 4000,
  },
  {
    id: "larger",
    label: text(
      "4,001–6,000 sq. ft. · up to 60 workstations / 6 toilets",
      "4 001–6 000 pi² · 60 postes / 6 WC maximum",
    ),
    hours: 6.5,
    area: 6000,
  },
  {
    id: "custom",
    label: text("Larger space or different requirements", "Plus grand local ou autres besoins"),
    hours: 0,
    area: 0,
  },
];

export const ROUTINE_TASKS: Copy[] = [
  text(
    "Dust and wipe accessible furniture and clear surfaces.",
    "Dépoussiérer et essuyer les meubles accessibles et surfaces dégagées.",
  ),
  text(
    "Vacuum rugs and carpets; sweep and mop suitable hard floors and stairs.",
    "Aspirer tapis et moquettes ; balayer et laver les sols adaptés et escaliers.",
  ),
  text(
    "Kitchen counters, sink, stovetop, appliance exteriors and microwave interior.",
    "Comptoirs, évier, dessus de cuisinière, extérieurs des appareils et intérieur du micro-ondes.",
  ),
  text(
    "Toilets, sinks, bath or shower, taps and mirrors; routine soap residue.",
    "WC, lavabos, baignoire ou douche, robinets et miroirs ; résidus de savon courants.",
  ),
  text(
    "Spot-wipe doors, handles, switches and cabinet exteriors; dust window sills.",
    "Essuyer les traces sur portes, poignées, interrupteurs et armoires ; dépoussiérer les rebords de fenêtres.",
  ),
  text(
    "Empty bins at the on-site collection point; client supplies bin liners.",
    "Vider les poubelles au point de collecte sur place ; sacs fournis par le client.",
  ),
];
export const DEEP_TASKS: Copy[] = [
  text(
    "Wash accessible baseboards, interior window sills and frames.",
    "Laver les plinthes accessibles, rebords et cadres intérieurs des fenêtres.",
  ),
  text(
    "Detailed wiping of doors, frames and cabinet exteriors.",
    "Essuyage détaillé des portes, encadrements et extérieurs des armoires.",
  ),
  text(
    "Wipe accessible vent-cover exteriors and tackle household grease and soap buildup.",
    "Essuyer l’extérieur des grilles accessibles et traiter les graisses et résidus de savon accumulés.",
  ),
];

export type Addon = {
  id: string;
  name: Copy;
  scope: Copy;
  price: number;
  deepPrice?: number;
  unit: Copy;
  max: number;
  group: "kitchen" | "rooms" | "detail";
  includedInDeep?: boolean;
  residentialOnly?: boolean;
  min?: number;
};
const each = text("each", "unité");
export const ADDONS: Addon[] = [
  {
    id: "fridge",
    name: text("Inside refrigerator", "Intérieur du réfrigérateur"),
    scope: text(
      "One emptied household fridge; shelves, drawers, walls and seals. No freezer defrosting.",
      "Un appareil domestique vidé ; tablettes, bacs, parois et joints. Sans dégivrage.",
    ),
    price: 30,
    unit: each,
    max: 1,
    group: "kitchen",
  },
  {
    id: "oven",
    name: text("Inside oven", "Intérieur du four"),
    scope: text(
      "One normally maintained oven cavity, racks and inner door glass.",
      "Une cavité normalement entretenue, grilles et vitre intérieure.",
    ),
    price: 40,
    unit: each,
    max: 1,
    group: "kitchen",
  },
  {
    id: "cabinets",
    name: text("Inside kitchen cabinets", "Intérieur des armoires"),
    scope: text(
      "Emptied cabinets and drawers, up to 20 door or drawer openings.",
      "Armoires et tiroirs vidés, jusqu’à 20 ouvertures de porte ou de tiroir.",
    ),
    price: 15,
    unit: each,
    max: 1,
    group: "kitchen",
  },
  {
    id: "stovetop",
    name: text("Detailed stovetop", "Dégraissage de la cuisinière"),
    scope: text(
      "Removable grates and burner caps. Routine wiping is already included.",
      "Grilles et chapeaux amovibles. L’essuyage courant est déjà inclus.",
    ),
    price: 25,
    unit: each,
    max: 1,
    group: "kitchen",
  },
  {
    id: "dishes",
    name: text("Handwash dishes", "Vaisselle à la main"),
    scope: text(
      "Up to 30 minutes of washing, drying and putting away per unit.",
      "Jusqu’à 30 minutes de lavage, séchage et rangement par unité.",
    ),
    price: 25,
    unit: text("30 minutes", "30 minutes"),
    max: 4,
    group: "kitchen",
  },
  {
    id: "dishwasher",
    name: text("Load dishwasher", "Charger le lave-vaisselle"),
    scope: text(
      "One load; client supplies dishwasher detergent. Unloading excluded.",
      "Un chargement ; détergent du client. Déchargement exclu.",
    ),
    price: 10,
    unit: text("load", "chargement"),
    max: 2,
    group: "kitchen",
  },
  {
    id: "linen",
    name: text("Change bed linen", "Changer les draps"),
    scope: text(
      "Make one bed using clean linen supplied by the client.",
      "Refaire un lit avec le linge propre fourni par le client.",
    ),
    price: 10,
    unit: text("bed", "lit"),
    max: 10,
    group: "rooms",
  },
  {
    id: "laundry",
    name: text("Laundry", "Lessive"),
    scope: text(
      "One load; up to 30 active minutes. Client machines and detergent; cycles must finish during the visit.",
      "Une brassée ; 30 minutes actives maximum. Machines et détergent du client ; cycles terminés pendant la visite.",
    ),
    price: 30,
    unit: text("load", "brassée"),
    max: 3,
    group: "rooms",
  },
  {
    id: "tidying",
    name: text("Tidying and organizing", "Rangement et organisation"),
    scope: text(
      "Simple tidying following your instructions; no hauling or disposal.",
      "Rangement simple selon vos consignes ; sans transport ni évacuation.",
    ),
    price: 50,
    unit: text("worker-hour", "heure-personne"),
    max: 4,
    group: "rooms",
  },
  {
    id: "bedroom",
    name: text("Extra bedroom", "Chambre supplémentaire"),
    scope: text(
      "Up to 150 sq. ft., outside your selected home profile.",
      "Jusqu’à 150 pi², hors du profil de logement choisi.",
    ),
    price: 20,
    deepPrice: 30,
    unit: each,
    max: 3,
    group: "rooms",
    residentialOnly: true,
  },
  {
    id: "bathroom",
    name: text("Extra full bathroom", "Salle de bain supplémentaire"),
    scope: text(
      "Toilet, sink and bath or shower, floors and mirrors; outside the base profile.",
      "WC, lavabo, baignoire ou douche, sols et miroirs ; hors profil de base.",
    ),
    price: 25,
    deepPrice: 40,
    unit: each,
    max: 4,
    group: "rooms",
    residentialOnly: true,
  },
  {
    id: "powder",
    name: text("Extra powder room", "Salle d’eau supplémentaire"),
    scope: text(
      "Toilet, sink, floor and mirror; outside the base profile.",
      "WC, lavabo, sol et miroir ; hors profil de base.",
    ),
    price: 15,
    deepPrice: 25,
    unit: each,
    max: 4,
    group: "rooms",
    residentialOnly: true,
  },
  {
    id: "basement",
    name: text("Open basement", "Sous-sol ouvert"),
    scope: text(
      "Up to 500 sq. ft.; separate rooms, bathrooms and kitchen cost extra.",
      "Jusqu’à 500 pi² ; pièces fermées, sanitaires et cuisine en supplément.",
    ),
    price: 50,
    deepPrice: 80,
    unit: each,
    max: 1,
    group: "rooms",
    residentialOnly: true,
  },
  {
    id: "kitchen",
    name: text("Extra kitchen", "Cuisine supplémentaire"),
    scope: text(
      "Counters, sink, cabinet and appliance exteriors, floor. Interiors excluded.",
      "Comptoirs, évier, extérieurs des armoires et appareils, sol. Intérieurs exclus.",
    ),
    price: 65,
    deepPrice: 90,
    unit: each,
    max: 2,
    group: "kitchen",
  },
  {
    id: "baseboards",
    name: text("Wash baseboards", "Laver les plinthes"),
    scope: text(
      "$45 up to 1,000 sq. ft.; $70 from 1,001 to 2,500 sq. ft. Included in deep cleaning. Larger areas need a quote.",
      "45 $ jusqu’à 1 000 pi² ; 70 $ de 1 001 à 2 500 pi². Inclus en profondeur. Plus grande surface sur devis.",
    ),
    price: 45,
    unit: text("area", "surface"),
    max: 1,
    group: "detail",
    includedInDeep: true,
  },
  {
    id: "doors",
    name: text("Doors and frames", "Portes et encadrements"),
    scope: text(
      "Detailed wiping of up to 10 standard interior doors and frames. Included in deep cleaning.",
      "Essuyage détaillé de 10 portes intérieures standard et encadrements maximum. Inclus en profondeur.",
    ),
    price: 20,
    unit: text("set of up to 10", "lot de 10 maximum"),
    max: 2,
    group: "detail",
    includedInDeep: true,
  },
  {
    id: "windows",
    name: text("Interior window glass", "Vitres intérieures"),
    scope: text(
      "Per accessible pane up to 1 m², inside face. Frames, tracks, screens and exterior excluded.",
      "Par vitrage accessible jusqu’à 1 m², face intérieure. Cadres, rails, moustiquaires et extérieur exclus.",
    ),
    price: 10,
    unit: text("pane", "vitrage"),
    max: 30,
    group: "detail",
  },
  {
    id: "tracks",
    name: text("Window tracks", "Rails de fenêtre"),
    scope: text(
      "Accessible tracks on one standard window, routine dirt.",
      "Rails accessibles d’une fenêtre standard, saleté courante.",
    ),
    price: 5,
    unit: text("window", "fenêtre"),
    max: 30,
    group: "detail",
  },
  {
    id: "blinds",
    name: text("Blinds", "Stores"),
    scope: text(
      "Dry dusting, up to 1.5 m wide per blind; no removal or soaking.",
      "Dépoussiérage, jusqu’à 1,5 m de largeur ; sans dépose ni trempage.",
    ),
    price: 15,
    unit: each,
    max: 20,
    group: "detail",
  },
  {
    id: "patio",
    name: text("Patio door glass", "Vitres de porte-patio"),
    scope: text(
      "One standard two-panel door, inside face only.",
      "Une porte standard à deux panneaux, face intérieure seulement.",
    ),
    price: 15,
    unit: text("door", "porte"),
    max: 4,
    group: "detail",
  },
  {
    id: "patioTracks",
    name: text("Patio door tracks", "Rails de porte-patio"),
    scope: text(
      "Accessible tracks for one standard two-panel door.",
      "Rails accessibles d’une porte standard à deux panneaux.",
    ),
    price: 10,
    unit: text("door", "porte"),
    max: 4,
    group: "detail",
  },
  {
    id: "wallSpots",
    name: text("Wall spot cleaning", "Traces sur les murs"),
    scope: text(
      "Targeted marks on washable surfaces, per 30 minutes of active work.",
      "Traces localisées sur surfaces lavables, par 30 minutes de travail actif.",
    ),
    price: 30,
    unit: text("30 minutes", "30 minutes"),
    max: 4,
    group: "detail",
  },
  {
    id: "walls",
    name: text("Full wall washing", "Lavage complet des murs"),
    scope: text(
      "Washable accessible walls, $55 per worker-hour; minimum two additional hours.",
      "Murs lavables accessibles, 55 $ par heure-personne ; minimum deux heures supplémentaires.",
    ),
    price: 55,
    unit: text("worker-hour", "heure-personne"),
    min: 2,
    max: 8,
    group: "detail",
  },
  {
    id: "petHair",
    name: text("Excess pet hair", "Poils d’animaux excessifs"),
    scope: text(
      "Extra removal from accessible surfaces, per 30 minutes. Routine vacuuming included.",
      "Retrait supplémentaire sur surfaces accessibles, par 30 minutes. Aspiration courante incluse.",
    ),
    price: 30,
    unit: text("30 minutes", "30 minutes"),
    max: 4,
    group: "detail",
  },
  {
    id: "garage",
    name: text("Empty garage sweep", "Balayage du garage vide"),
    scope: text(
      "Up to 300 sq. ft.; dry sweeping, no degreasing, pressure washing or hauling.",
      "Jusqu’à 300 pi² ; balayage à sec, sans dégraissage, pression ni évacuation.",
    ),
    price: 20,
    unit: each,
    max: 1,
    group: "detail",
  },
  {
    id: "balcony",
    name: text("Balcony", "Balcon"),
    scope: text(
      "Up to 100 sq. ft.; sweep and wipe accessible railings, no pressure washing.",
      "Jusqu’à 100 pi² ; balayage et essuyage des garde-corps accessibles, sans pression.",
    ),
    price: 20,
    unit: each,
    max: 2,
    group: "detail",
  },
];

export type AddonFrequency = "first" | "every";

export type PricingSelection = {
  audience: Audience;
  plan: PlanId;
  profile: string;
  condition: "normal" | "heavy";
  businessType: "office" | "retail" | "common" | "specialist";
  visitsPerWeek: number;
  customFrequency: string;
  province: "Ontario" | "Quebec";
  addons: Record<string, number>;
  addonFrequencies?: Record<string, AddonFrequency>;
};
export const initialSelection = (audience: Audience): PricingSelection => ({
  audience,
  plan: audience === "residential" ? "biweekly" : "recurring",
  profile: "small",
  condition: "normal",
  businessType: "office",
  visitsPerWeek: 1,
  customFrequency: "",
  province: "Ontario",
  addons: {},
  addonFrequencies: {},
});
export function frequencyLabel(s: PricingSelection, locale: Locale): string {
  if (s.plan === "flexible" || (s.audience === "commercial" && s.plan === "recurring")) {
    if (Number.isInteger(s.visitsPerWeek) && s.visitsPerWeek >= 1 && s.visitsPerWeek <= 7)
      return `${s.visitsPerWeek} ${locale === "fr" ? "visite(s) par semaine" : "visit(s) per week"}`;
    return (
      s.customFrequency?.trim() ||
      (locale === "fr" ? "Autre fréquence à préciser" : "Other schedule to specify")
    );
  }
  return PLANS.find((p) => p.id === s.plan)?.name[locale] ?? s.plan;
}
export const isRecurringSelection = (s: PricingSelection) =>
  ["weekly", "biweekly", "monthly", "recurring", "flexible"].includes(s.plan);

// Recurrence is explicit. Missing or unrecognized choices never create recurring extras.
export const addonFrequency = (s: PricingSelection, id: string): AddonFrequency =>
  isRecurringSelection(s) && s.addonFrequencies?.[id] === "every" ? "every" : "first";

export function addonFrequencyLabel(s: PricingSelection, id: string, locale: Locale): string {
  if (!isRecurringSelection(s)) return text("This visit only", "Cette visite seulement")[locale];
  return addonFrequency(s, id) === "every"
    ? text("Every visit", "À chaque visite")[locale]
    : text("First visit only", "Première visite seulement")[locale];
}

function selectedAddons(s: PricingSelection) {
  return ADDONS.flatMap((addon) => {
    if (
      (s.audience === "commercial" && addon.residentialOnly) ||
      (s.plan === "deep" && addon.includedInDeep)
    )
      return [];
    const raw = s.addons[addon.id];
    const q = Number.isFinite(raw) ? Math.min(addon.max, Math.max(0, Math.floor(raw))) : 0;
    return q
      ? [{ addon, quantity: Math.max(addon.min ?? 1, q), frequency: addonFrequency(s, addon.id) }]
      : [];
  });
}

type EstimateLine = {
  id: string;
  label: Copy;
  quantity: number;
  unitPrice: number;
  total: number;
  frequency: AddonFrequency;
};

function withBundleSaving(lines: EstimateLine[]): EstimateLine[] {
  if (!lines.some((l) => l.id === "fridge") || !lines.some((l) => l.id === "oven")) return lines;
  const everyVisit = lines
    .filter((l) => l.id === "fridge" || l.id === "oven")
    .every((l) => l.frequency === "every");
  return [
    ...lines,
    {
      id: "bundleSaving",
      label: text("Fridge and oven bundle saving", "Économie du forfait réfrigérateur et four"),
      quantity: 1,
      unitPrice: -5,
      total: -5,
      frequency: everyVisit ? "every" : "first",
    },
  ];
}

export const addonPrice = (a: Addon, s: PricingSelection, area: number) =>
  a.id === "baseboards" && area > 1000
    ? 70
    : s.plan === "deep"
      ? (a.deepPrice ?? a.price)
      : a.price;
export const taxesFor = (amount: number, province: PricingSelection["province"]) =>
  province === "Quebec"
    ? [
        { name: text("GST 5%", "TPS 5 %"), amount: round(amount * 0.05) },
        { name: text("QST 9.975%", "TVQ 9,975 %"), amount: round(amount * 0.09975) },
      ]
    : [{ name: text("HST 13%", "TVH 13 %"), amount: round(amount * 0.13) }];

export function calculateCleaningEstimate(s: PricingSelection) {
  const plans = plansFor(s.audience);
  const plan = plans.find((p) => p.id === s.plan);
  const profile = (s.audience === "residential" ? HOME_PROFILES : BUSINESS_PROFILES).find(
    (p) => p.id === s.profile,
  );
  const requiresVisit =
    !plan ||
    !profile ||
    (plan.rate === null && plan.id !== "flexible") ||
    !profile.hours ||
    s.condition === "heavy" ||
    (s.audience === "commercial" && s.businessType === "specialist") ||
    (s.plan !== "deep" && (s.addons.baseboards ?? 0) > 0 && profile.area > 2500);
  const requiresRateReview =
    s.plan === "flexible" ||
    (s.audience === "commercial" && s.plan === "recurring" && s.visitsPerWeek !== 1);
  if (requiresVisit || requiresRateReview)
    return {
      requiresQuote: true as const,
      requiresVisit: Boolean(requiresVisit),
      requiresRateReview,
      version: PRICING_VERSION,
      plan,
      profile,
    };
  const rate = plan.rate!;
  const deepHours =
    HOME_PROFILES.find((p) => s.audience === "residential" && p.id === s.profile)?.deepHours ??
    Math.max(4.5, profile!.hours * 1.5);
  const hours =
    s.plan === "extras"
      ? 0
      : Math.ceil(Math.max(plan.minimum, s.plan === "deep" ? deepHours : profile!.hours) * 4) / 4;
  const selectedLines: EstimateLine[] = selectedAddons(s).map(({ addon, quantity, frequency }) => {
    const unitPrice = addonPrice(addon, s, profile!.area);
    return {
      id: addon.id,
      label: addon.name,
      quantity,
      unitPrice,
      total: round(quantity * unitPrice),
      frequency,
    };
  });
  const lines = withBundleSaving(selectedLines);
  const residentialRecurring =
    s.audience === "residential" && ["weekly", "biweekly", "monthly"].includes(s.plan);
  const recurring = residentialRecurring || s.plan === "recurring";
  const recurringLines = recurring
    ? withBundleSaving(selectedLines.filter((line) => line.frequency === "every"))
    : [];
  const recurringExtras = round(recurringLines.reduce((sum, line) => sum + line.total, 0));
  const selectedExtras = round(lines.reduce((sum, l) => sum + l.total, 0));
  if (s.plan === "extras" && selectedExtras < 150)
    lines.push({
      id: "minimumVisit",
      label: text(
        "Adjustment to the $150 visit minimum",
        "Complément au minimum de visite de 150 $",
      ),
      quantity: 1,
      frequency: "first",
      unitPrice: round(150 - selectedExtras),
      total: round(150 - selectedExtras),
    });
  const extras = round(lines.reduce((sum, l) => sum + l.total, 0));
  const base = round(hours * rate),
    subtotal = round(base + (recurring ? recurringExtras : extras));
  const firstRate = recurring ? 50 : rate;
  const firstSubtotal = round(hours * firstRate + extras);
  const taxes = taxesFor(firstSubtotal, s.province);
  const total = round(firstSubtotal + taxes.reduce((sum, t) => sum + t.amount, 0));
  const subsequentTaxes = taxesFor(subtotal, s.province);
  const subsequentTotal = round(subtotal + subsequentTaxes.reduce((sum, t) => sum + t.amount, 0));
  const qualifyingSubtotal = round(hours * firstRate + recurringExtras);
  const qualifyingTaxes = taxesFor(qualifyingSubtotal, s.province);
  const qualifyingTotal = round(
    qualifyingSubtotal + qualifyingTaxes.reduce((sum, tax) => sum + tax.amount, 0),
  );
  const fourthCredit = recurring ? round(3 * round(hours * firstRate - base)) : 0;
  const fourthSubtotal = recurring ? round(subtotal - fourthCredit) : firstSubtotal;
  const fourthTaxes = taxesFor(fourthSubtotal, s.province);
  const fourthTotal = round(fourthSubtotal + fourthTaxes.reduce((sum, tax) => sum + tax.amount, 0));
  const frequency =
    s.audience === "commercial"
      ? [1, 2, 3, 5].includes(s.visitsPerWeek)
        ? (s.visitsPerWeek * 52) / 12
        : 52 / 12
      : s.plan === "weekly"
        ? 52 / 12
        : s.plan === "biweekly"
          ? 26 / 12
          : 1;
  return {
    requiresQuote: false as const,
    requiresVisit: false as const,
    requiresRateReview: false as const,
    version: PRICING_VERSION,
    plan: plan!,
    profile: profile!,
    rate,
    hours,
    lines,
    extras,
    recurringLines,
    recurringExtras,
    subsequentTaxes,
    qualifyingSubtotal,
    qualifyingTaxes,
    qualifyingTotal,
    fourthCredit,
    fourthSubtotal,
    fourthTaxes,
    fourthTotal,
    base,
    subtotal,
    firstRate,
    firstSubtotal,
    taxes,
    total,
    subsequentTotal,
    recurring,
    residentialRecurring,
    monthly: recurring ? round(subtotal * frequency) : null,
    bundleSaving: lines.some((line) => line.id === "bundleSaving") ? 5 : 0,
    recurringBundleSaving: recurringLines.some((line) => line.id === "bundleSaving") ? 5 : 0,
    packageSaving: recurring ? packageSaving(hours, rate) : 0,
  };
}
export type CleaningEstimate = ReturnType<typeof calculateCleaningEstimate>;

export function pricingAnswers(
  s: PricingSelection,
  e: CleaningEstimate,
  locale: Locale,
): Record<string, string> {
  const chosen = selectedAddons(s);
  const none = text("None", "Aucun")[locale];
  const recurring = isRecurringSelection(s);
  const summary = [
    `${text("Space", "Espace")[locale]}: ${text(s.audience === "residential" ? "Residential" : "Commercial", s.audience === "residential" ? "Résidentiel" : "Commercial")[locale]}`,
    `${text("Service", "Prestation")[locale]}: ${e.plan?.name[locale] ?? s.plan}`,
    `${text("Property", "Lieu")[locale]}: ${e.profile?.label[locale] ?? s.profile}`,
    `${text("Schedule", "Fréquence")[locale]}: ${frequencyLabel(s, locale)}`,
    `${text("Condition", "État")[locale]}: ${s.condition === "heavy" ? text("Heavy buildup / specialist assessment", "Encrassement important / évaluation spécialisée")[locale] : text("Normal use", "Usage normal")[locale]}`,
    `${text("Province", "Province")[locale]}: ${s.province === "Quebec" ? "Québec" : "Ontario"}`,
  ].join("\n");
  const schedule =
    chosen
      .map(
        ({ addon, quantity }) =>
          `${addon.name[locale]} × ${quantity} — ${addonFrequencyLabel(s, addon.id, locale)}`,
      )
      .join("\n") || none;
  const renderLines = (lines: EstimateLine[]) =>
    lines
      .map((line) => `${line.label[locale]} × ${line.quantity}: ${money(line.total, locale)}`)
      .join("\n") || none;
  const result: Record<string, string> = {
    "Request source": "cleaning_pricing",
    "Service scope EN": cleaningServiceScope(s, "en"),
    "Service scope FR": cleaningServiceScope(s, "fr"),
    "Pricing version": PRICING_VERSION,
    "Customer type": s.audience,
    Plan: e.plan?.name[locale] ?? s.plan,
    "Property profile": e.profile?.label[locale] ?? s.profile,
    Condition: s.condition,
    "Business type": s.audience === "commercial" ? s.businessType : "Not applicable",
    "Requested frequency": frequencyLabel(s, locale),
    "Visits per week":
      s.plan === "weekly"
        ? "1"
        : s.plan === "flexible" || (s.audience === "commercial" && s.plan === "recurring")
          ? s.visitsPerWeek > 0
            ? String(s.visitsPerWeek)
            : "Custom"
          : "See plan",
    "Custom frequency details": s.customFrequency?.trim() || "Not applicable",
    "Frequency-based rate review required": e.requiresRateReview ? "Yes" : "No",
    "Estimate province": s.province,
    "Free on-site assessment required": e.requiresVisit ? "Yes" : "No",
    "Estimate status": text(
      "Provisional only — review required before an official quote",
      "Estimation provisoire — validation requise avant le devis officiel",
    )[locale],
    "Selection summary": summary,
    "Add-on schedule": schedule,
    "Selected add-ons": schedule,
    ...(recurring
      ? {
          "Recurring eligibility visits": "4",
          "Recurring billing policy": "four-consecutive-v1",
          "Recurring pricing condition": RECURRING_CONDITION[locale],
        }
      : {}),
    "Add-on recurrence policy": recurring
      ? text(
          "First visit only unless Every visit is explicitly selected. The bundle saving applies only when both services occur at the same visit.",
          "Première visite seulement, sauf choix explicite À chaque visite. La remise du forfait s’applique uniquement si les deux prestations ont lieu à la même visite.",
        )[locale]
      : text(
          "Selected extras apply to this single visit.",
          "Les suppléments choisis s’appliquent à cette visite unique.",
        )[locale],
  };
  if (!e.requiresQuote)
    Object.assign(result, {
      "Estimated base worker-hours": String(e.hours),
      "First visit base rate CAD per worker-hour": String(e.firstRate),
      "Base rate CAD per worker-hour": String(e.rate),
      "Selected add-ons":
        chosen
          .map(
            ({ addon, quantity }) =>
              `${addon.name[locale]} × ${quantity}: ${money(quantity * addonPrice(addon, s, e.profile.area), locale)} — ${addonFrequencyLabel(s, addon.id, locale)}`,
          )
          .join("\n") || none,
      "First visit add-ons": renderLines(e.lines),
      "First visit add-ons subtotal CAD": String(e.extras),
      "First visit subtotal CAD": String(e.firstSubtotal),
      "First visit taxes": e.taxes
        .map((tax) => `${tax.name[locale]}: ${money(tax.amount, locale)}`)
        .join("\n"),
      "First visit total CAD": String(e.total),
      ...(e.recurring
        ? {
            "Qualifying visit base rate CAD per worker-hour": String(e.firstRate),
            "Qualifying visit add-ons": renderLines(e.recurringLines),
            "Qualifying visit add-ons subtotal CAD": String(e.recurringExtras),
            "Qualifying visit subtotal CAD": String(e.qualifyingSubtotal),
            "Qualifying visit taxes": e.qualifyingTaxes
              .map((tax) => `${tax.name[locale]}: ${money(tax.amount, locale)}`)
              .join("\n"),
            "Qualifying visit total CAD": String(e.qualifyingTotal),
            "Fourth visit credit CAD": String(e.fourthCredit),
            "Fourth visit subtotal CAD": String(e.fourthSubtotal),
            "Fourth visit taxes": e.fourthTaxes
              .map((tax) => `${tax.name[locale]}: ${money(tax.amount, locale)}`)
              .join("\n"),
            "Fourth visit total CAD": String(e.fourthTotal),
            "Four-visit billing schedule": [
              `${text("Visit 1, full rate", "Visite 1, tarif complet")[locale]}: ${money(e.total, locale)}`,
              `${text("Visits 2 and 3, full rate, each", "Visites 2 et 3, tarif complet, chacune")[locale]}: ${money(e.qualifyingTotal, locale)}`,
              `${text("Visit 4 after credit", "Visite 4 après crédit")[locale]}: ${money(e.fourthTotal, locale)}`,
              `${text("Accumulated credit before tax", "Crédit cumulé avant taxes")[locale]}: ${money(e.fourthCredit, locale)}`,
              `${text("Visit 5 onward, each", "À partir de la visite 5, chacune")[locale]}: ${money(e.subsequentTotal, locale)}`,
            ].join("\n"),
            "Recurring visit add-ons": renderLines(e.recurringLines),
            "Recurring visit add-ons subtotal CAD": String(e.recurringExtras),
            "Recurring visit subtotal CAD": String(e.subtotal),
            "Recurring visit taxes": e.subsequentTaxes
              .map((tax) => `${tax.name[locale]}: ${money(tax.amount, locale)}`)
              .join("\n"),
            "Recurring visit total CAD": String(e.subsequentTotal),
          }
        : {}),
      "Recurring package saving before tax CAD": String(e.packageSaving),
      "Average recurring month before tax CAD":
        e.monthly === null ? "Not applicable" : String(e.monthly),
      "Monthly budget basis": text(
        "Average at the eligible recurring rate, after the four-visit condition. Actual invoices 1–3 are higher and invoice 4 includes the accumulated credit. Excludes first-visit-only extras.",
        "Moyenne au tarif récurrent admissible, après la condition des quatre visites. Les factures 1 à 3 sont plus élevées et la facture 4 inclut le crédit cumulé. Hors options de première visite.",
      )[locale],
    });
  return result;
}

/** Snapshot of the offered work, without recalculating or embedding any price. */
export function cleaningServiceScope(s: PricingSelection, locale: Locale): string {
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const plan = PLANS.find((p) => p.id === s.plan);
  const profile = (s.audience === "residential" ? HOME_PROFILES : BUSINESS_PROFILES).find(
    (p) => p.id === s.profile,
  );
  if (
    !plan ||
    !profile ||
    profile.id === "custom" ||
    s.plan === "specialist" ||
    s.condition === "heavy" ||
    (s.audience === "commercial" && s.businessType === "specialist")
  )
    return "";
  const recurring = isRecurringSelection(s);
  const chosen = selectedAddons(s);
  const section = (title: string, lines: string[]) =>
    `## ${title}\n${lines.map((line) => `- ${line.replace(/[\r\n]+/g, " ")}`).join("\n")}`;
  const routine = s.plan === "extras" ? [] : ROUTINE_TASKS.map((task) => task[locale]);
  if (s.plan !== "extras" && s.audience === "commercial")
    routine.push(
      t(
        "Clear desks, reception, kitchenette and washrooms in the agreed premises; replenish accessible dispensers with client-supplied paper, user soap and liners.",
        "Bureaux dégagés, réception, kitchenette et sanitaires du local convenu ; réapprovisionnement des distributeurs accessibles avec papier, savon des usagers et sacs fournis par le client.",
      ),
    );
  if (s.plan === "deep") routine.push(...DEEP_TASKS.map((task) => task[locale]));
  const visits = recurring ? [1, 2, 3, 4, 5] : [1];
  return [
    section(t("Service and premises", "Prestation et lieux"), [
      `${t("Service", "Prestation")} : ${plan.name[locale]} — ${t(s.audience === "residential" ? "Residential" : "Commercial", s.audience === "residential" ? "Résidentiel" : "Commercial")}`,
      `${t("Property", "Lieu")} : ${profile.label[locale]}`,
      `${t("Agreed frequency", "Fréquence convenue")} : ${frequencyLabel(s, locale)}`,
      t(
        "Normal use and accessible, cleared surfaces within the stated property profile.",
        "Usage normal, surfaces accessibles et dégagées dans les limites du profil indiqué.",
      ),
    ]),
    section(
      t("Included cleaning", "Nettoyage compris"),
      routine.length
        ? routine
        : [
            t(
              "Selected additional services only. No general cleaning is included.",
              "Uniquement les prestations supplémentaires choisies. Aucun nettoyage général n’est compris.",
            ),
          ],
    ),
    ...visits.map((visit) =>
      section(
        visit === 5
          ? t("Visit 5 onward", "À partir de la visite 5")
          : `${t("Visit", "Visite")} ${visit}`,
        [
          ...(routine.length
            ? [
                t(
                  "All the tasks listed under Included cleaning, for the premises described above.",
                  "Toutes les tâches de la rubrique Nettoyage compris, pour les lieux décrits ci-dessus.",
                ),
              ]
            : []),
          ...chosen
            .filter((item) => visit === 1 || item.frequency === "every")
            .map(
              ({ addon, quantity }) =>
                `${addon.name[locale]} × ${quantity} (${addon.unit[locale]}) — ${addon.scope[locale]}`,
            ),
          ...(!chosen.some((item) => visit === 1 || item.frequency === "every")
            ? [
                t(
                  "No additional services selected for this visit.",
                  "Aucune prestation supplémentaire sélectionnée pour cette visite.",
                ),
              ]
            : []),
          ...(visit === 4
            ? [
                t(
                  "The fourth-visit credit changes the price only; the agreed cleaning tasks remain the same.",
                  "Le crédit de la quatrième visite modifie uniquement le prix ; les tâches d’entretien convenues restent identiques.",
                ),
              ]
            : []),
        ],
      ),
    ),
    section(t("Products and preparation", "Produits et préparation"), [
      t(
        "Suitable cleaning products and everyday equipment (cloths, vacuum, mop and small tools) are included, along with usual travel within the agreed urban Ottawa/Gatineau service area.",
        "Les produits adaptés et le matériel courant (chiffons, aspirateur, vadrouille et petits outils) sont inclus, ainsi que le déplacement urbain habituel dans la zone Ottawa/Gatineau convenue.",
      ),
      t(
        "The client provides access to the agreed rooms and identifies delicate surfaces, allergies and any product restrictions before the visit. Rooms and work surfaces must be accessible; no heavy furniture moving is included.",
        "Le client donne accès aux pièces convenues et signale les surfaces délicates, allergies et restrictions de produits avant la visite. Les pièces et surfaces doivent être accessibles ; aucun déplacement de mobilier lourd n’est compris.",
      ),
      t(
        "Bin liners, washroom paper and user soap are supplied by the client unless separately itemized. Clean bed linen and dishwasher detergent are client-supplied when these options are selected.",
        "Sacs, papier sanitaire et savon des usagers sont fournis par le client sauf mention distincte. Linge de lit propre et détergent du lave-vaisselle sont fournis par le client lorsque ces options sont choisies.",
      ),
    ]),
    section(t("Limits and excluded work", "Limites et prestations exclues"), [
      t(
        "Only the tasks and quantities expressly listed in this annex are included. Appliance and cabinet interiors (except the microwave), window glass, laundry, dishes, balconies and garages are excluded unless listed for that visit. Any selected option retains its stated area, quantity and access limits.",
        "Seules les tâches et quantités expressément listées dans cette annexe sont comprises. Intérieurs d’appareils et d’armoires (sauf micro-ondes), vitres, lessive, vaisselle, balcons et garages sont exclus sauf mention pour la visite concernée. Chaque option conserve ses limites de surface, quantité et accès.",
      ),
      t(
        "Major post-construction cleaning, mould, flooding/water damage, carpet or upholstery extraction, machine floor care, high/exterior windows and other specialist work require a free on-site assessment and a separate written quote.",
        "Nettoyage après gros travaux, moisissures, inondations/dégâts d’eau, extraction des tapis ou tissus, entretien mécanisé des sols, vitres hautes/extérieures et autres travaux spécialisés nécessitent une visite gratuite sur site et un devis écrit distinct.",
      ),
      t(
        "Any additional task or change of frequency, area or quantity must be agreed in writing, with its price, before the work is performed. Unlisted services do not become included because a minimum visit charge applies.",
        "Toute tâche supplémentaire ou modification de fréquence, surface ou quantité doit être convenue par écrit avec son prix avant exécution. Un minimum de facturation ne rend pas incluses les prestations non listées.",
      ),
    ]),
    section(t("Quality follow-up", "Suivi qualité"), [
      t(
        "Assigned OMSG employees are trained for their tasks and have undergone criminal background checks.",
        "Les employés OMSG affectés à l’intervention sont formés à leurs tâches et ont fait l’objet d’une vérification des antécédents judiciaires.",
      ),
      t(
        "A completed checklist of the agreed tasks and observations is sent to the client after each visit. Before/after photos are taken only with prior client authorization and included in the private report. Photos are optional; declining them does not affect the cleaning service.",
        "Une checklist des tâches convenues, réalisées et des observations est transmise au client après chaque visite. Des photos avant/après sont prises uniquement avec son autorisation préalable et jointes au rapport privé. Elles sont facultatives ; leur refus ne modifie pas le service de nettoyage.",
      ),
    ]),
  ].join("\n\n");
}

/** Used only while preparing a NEW draft, never to display or rewrite an issued quote. */
export function proposedScopeFromAnswers(answers: Record<string, unknown>, locale: Locale) {
  const saved = answers[`Service scope ${locale.toUpperCase()}`];
  if (typeof saved === "string" && saved.trim().startsWith("## ") && saved.length <= 60000)
    return { body: saved, source: "saved" as const };
  const empty = { body: "", source: "manual" as const };
  if (answers["Customer type"] !== "residential" && answers["Customer type"] !== "commercial")
    return empty;
  const s = initialSelection(answers["Customer type"]);
  const plan = plansFor(s.audience).find((p) =>
    Object.values(p.name).includes(String(answers.Plan)),
  );
  const profile = (s.audience === "residential" ? HOME_PROFILES : BUSINESS_PROFILES).find((p) =>
    Object.values(p.label).includes(String(answers["Property profile"])),
  );
  if (!plan || !profile || answers.Condition !== "normal") return empty;
  s.plan = plan.id;
  s.profile = profile.id;
  if (s.audience === "commercial") {
    if (!["office", "retail", "common"].includes(String(answers["Business type"]))) return empty;
    s.businessType = answers["Business type"] as PricingSelection["businessType"];
  }
  s.visitsPerWeek = Number(answers["Visits per week"] || 0);
  s.customFrequency = String(answers["Requested frequency"] || "");
  const schedule = answers["Add-on schedule"];
  if (typeof schedule !== "string") return empty;
  if (!/^(None|Aucun)$/.test(schedule))
    for (const line of schedule.split("\n")) {
      const match = line.match(/^(.+?) × (\d+) — (.+)$/);
      if (!match) return empty;
      const addon = ADDONS.find((a) => Object.values(a.name).includes(match[1]));
      if (!addon || s.addons[addon.id] || (addon.residentialOnly && s.audience === "commercial"))
        return empty;
      const quantity = Number(match[2]);
      if (quantity < (addon.min || 1) || quantity > addon.max) return empty;
      if (
        !/^(Every visit|À chaque visite|First visit only|Première visite seulement|This visit only|Cette visite seulement)$/.test(
          match[3],
        )
      )
        return empty;
      s.addons[addon.id] = quantity;
      s.addonFrequencies![addon.id] = /^(Every visit|À chaque visite)$/.test(match[3])
        ? "every"
        : "first";
    }
  const body = cleaningServiceScope(s, locale);
  return body ? { body, source: "proposed" as const } : empty;
}
