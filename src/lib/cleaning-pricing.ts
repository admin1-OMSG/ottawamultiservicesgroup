/** Public estimates only. Official quotes are reviewed and issued through the CRM. */
export const PRICING_VERSION = "2026-09-20-v4";
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
  const lines: { id: string; label: Copy; quantity: number; unitPrice: number; total: number }[] =
    [];
  for (const a of ADDONS) {
    if (s.audience === "commercial" && a.residentialOnly) continue;
    if (s.plan === "deep" && a.includedInDeep) continue;
    const raw = s.addons[a.id];
    const q = Number.isFinite(raw) ? Math.min(a.max, Math.max(0, Math.floor(raw))) : 0;
    if (!q) continue;
    const quantity = Math.max(a.min ?? 1, q);
    const unitPrice = addonPrice(a, s, profile!.area);
    lines.push({
      id: a.id,
      label: a.name,
      quantity,
      unitPrice,
      total: round(quantity * unitPrice),
    });
  }
  const bundled = lines.some((l) => l.id === "fridge") && lines.some((l) => l.id === "oven");
  if (bundled)
    lines.push({
      id: "bundleSaving",
      label: text("Fridge and oven bundle saving", "Économie du forfait réfrigérateur et four"),
      quantity: 1,
      unitPrice: -5,
      total: -5,
    });
  const selectedExtras = round(lines.reduce((sum, l) => sum + l.total, 0));
  if (s.plan === "extras" && selectedExtras < 150)
    lines.push({
      id: "minimumVisit",
      label: text(
        "Adjustment to the $150 visit minimum",
        "Complément au minimum de visite de 150 $",
      ),
      quantity: 1,
      unitPrice: round(150 - selectedExtras),
      total: round(150 - selectedExtras),
    });
  const extras = round(lines.reduce((sum, l) => sum + l.total, 0));
  const base = round(hours * rate),
    subtotal = round(base + extras);
  const residentialRecurring =
    s.audience === "residential" && ["weekly", "biweekly", "monthly"].includes(s.plan);
  const recurring = residentialRecurring || s.plan === "recurring";
  const firstRate = residentialRecurring ? 50 : rate;
  const firstSubtotal = round(hours * firstRate + extras);
  const taxes = taxesFor(firstSubtotal, s.province);
  const total = round(firstSubtotal + taxes.reduce((sum, t) => sum + t.amount, 0));
  const subsequentTaxes = taxesFor(subtotal, s.province);
  const subsequentTotal = round(subtotal + subsequentTaxes.reduce((sum, t) => sum + t.amount, 0));
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
    bundleSaving: bundled ? 5 : 0,
    packageSaving: recurring ? packageSaving(hours, rate) : 0,
  };
}
export type CleaningEstimate = ReturnType<typeof calculateCleaningEstimate>;

export function pricingAnswers(
  s: PricingSelection,
  e: CleaningEstimate,
  locale: Locale,
): Record<string, string> {
  const result: Record<string, string> = {
    "Request source": "cleaning_pricing",
    "Pricing version": PRICING_VERSION,
    "Customer type": s.audience,
    Plan: e.plan?.name[locale] ?? s.plan,
    "Property profile": e.profile?.label[locale] ?? s.profile,
    Condition: s.condition,
    "Business type": s.audience === "commercial" ? s.businessType : "Not applicable",
    "Requested frequency": frequencyLabel(s, locale),
    "Visits per week":
      s.plan === "flexible" || (s.audience === "commercial" && s.plan === "recurring")
        ? s.visitsPerWeek > 0
          ? String(s.visitsPerWeek)
          : "Custom"
        : "See plan",
    "Custom frequency details": s.customFrequency?.trim() || "Not applicable",
    "Frequency-based rate review required": e.requiresRateReview ? "Yes" : "No",
    "Estimate province": s.province,
    "Free on-site assessment required": e.requiresVisit ? "Yes" : "No",
    "Estimate status": "Provisional only — review required before an official quote",
    "Selected add-ons":
      ADDONS.filter(
        (a) => (s.addons[a.id] ?? 0) > 0 && (!a.residentialOnly || s.audience === "residential"),
      )
        .map((a) => `${a.name[locale]} × ${s.addons[a.id]}`)
        .join("; ") || "None",
    "Selection JSON": JSON.stringify(s),
  };
  if (!e.requiresQuote)
    Object.assign(result, {
      "Estimated base worker-hours": String(e.hours),
      "Base rate CAD per worker-hour": String(e.rate),
      "Selected add-ons":
        e.lines
          .map((l) => `${l.label[locale]} × ${l.quantity}: ${money(l.total, locale)}`)
          .join("; ") || "None",
      "First visit subtotal CAD": String(e.firstSubtotal),
      "First visit total CAD": String(e.total),
      "Recurring visit subtotal CAD": e.recurring ? String(e.subtotal) : "Not applicable",
      "Recurring package saving before tax CAD": String(e.packageSaving),
      "Average recurring month before tax CAD":
        e.monthly === null ? "Not applicable" : String(e.monthly),
    });
  return result;
}
