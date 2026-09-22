import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Truck,
  Snowflake,
  Leaf,
  Car,
  Wrench,
  Building2,
  Home,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our Services | Ottawa Multi Services Group" },
      {
        name: "description",
        content:
          "Explore residential and commercial services across Ottawa-Gatineau: cleaning, moving, landscaping, snow removal, mobile detailing, tire change and more.",
      },
      { property: "og:title", content: "Our Services — Ottawa MSG" },
      {
        property: "og:description",
        content: "Residential and commercial services across Ottawa-Gatineau.",
      },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const SERVICE_LINKS: Record<string, string> = {
  "House Cleaning": "/house-cleaning-ottawa",
  "Mobile Vehicle Detailing": "/mobile-car-detailing-ottawa",
  "Lawn & Landscaping": "/landscaping-ottawa",
  "Snow Removal": "/snow-removal-ottawa",
  "Moving Services": "/moving-services-ottawa",
  "Mobile Tire Change": "/mobile-tire-change-ottawa",
  "Handyman & Maintenance": "/handyman-ottawa",
  "Office Cleaning": "/commercial-cleaning-ottawa",
  "Commercial Snow Removal": "/snow-removal-ottawa",
  "Commercial Lawn Care": "/landscaping-ottawa",
  "Property Maintenance": "/handyman-ottawa",
  "Janitorial Services": "/commercial-cleaning-ottawa",
};

const CATEGORIES = [
  {
    kind: "Residential",
    items: [
      {
        icon: Sparkles,
        title: "House Cleaning",
        body: "Regular, deep, move-in/out, Airbnb turnover and post-construction cleans.",
      },
      {
        icon: Car,
        title: "Mobile Vehicle Detailing",
        body: "Exterior, interior and full-detail packages at your driveway.",
      },
      {
        icon: Leaf,
        title: "Lawn & Landscaping",
        body: "Mowing, trimming, spring and fall cleanups, garden maintenance.",
      },
      {
        icon: Snowflake,
        title: "Snow Removal",
        body: "Per-visit or seasonal contracts for driveways and walkways.",
      },
      {
        icon: Truck,
        title: "Moving Services",
        body: "Local residential moves, packing service and loading crews.",
      },
      {
        icon: Wrench,
        title: "Mobile Tire Change",
        body: "Seasonal swaps, flat repairs and battery boosts on-site.",
      },
      {
        icon: Home,
        title: "Handyman & Maintenance",
        body: "Small repairs, mounting, assembly and touch-ups.",
      },
    ],
  },
  {
    kind: "Commercial",
    items: [
      {
        icon: Building2,
        title: "Office Cleaning",
        body: "Scheduled cleans for offices of every size.",
      },
      {
        icon: Snowflake,
        title: "Commercial Snow Removal",
        body: "Parking lots, walkways, salting and 24/7 response.",
      },
      {
        icon: Leaf,
        title: "Commercial Lawn Care",
        body: "Contracts for retail, industrial and condo properties.",
      },
      {
        icon: Wrench,
        title: "Property Maintenance",
        body: "General upkeep, repairs and on-call service.",
      },
      {
        icon: Sparkles,
        title: "Janitorial Services",
        body: "Full-service janitorial for offices, retail and medical.",
      },
    ],
  },
] as const;

const FRENCH_SERVICES: Record<string, { title: string; body: string }> = {
  "House Cleaning": {
    title: "Nettoyage résidentiel",
    body: "Nettoyage régulier, en profondeur, avant ou après déménagement, entre locations Airbnb et après construction.",
  },
  "Mobile Vehicle Detailing": {
    title: "Esthétique automobile à domicile",
    body: "Forfaits de nettoyage extérieur, intérieur ou complet dans votre entrée.",
  },
  "Lawn & Landscaping": {
    title: "Pelouse et aménagement paysager",
    body: "Tonte, taille, nettoyages du printemps et de l’automne et entretien du jardin.",
  },
  "Snow Removal": {
    title: "Déneigement",
    body: "Services à la visite ou contrats saisonniers pour les entrées et les allées piétonnes.",
  },
  "Moving Services": {
    title: "Services de déménagement",
    body: "Déménagements résidentiels locaux, service d’emballage et équipes de chargement.",
  },
  "Mobile Tire Change": {
    title: "Changement de pneus à domicile",
    body: "Changements saisonniers, réparations de crevaisons et démarrage de batterie sur place.",
  },
  "Handyman & Maintenance": {
    title: "Petits travaux et entretien",
    body: "Petites réparations, fixation, assemblage et retouches.",
  },
  "Office Cleaning": {
    title: "Nettoyage de bureaux",
    body: "Nettoyages planifiés pour des bureaux de toutes tailles.",
  },
  "Commercial Snow Removal": {
    title: "Déneigement commercial",
    body: "Stationnements, allées piétonnes, épandage de sel et interventions 24 h sur 24, 7 jours sur 7.",
  },
  "Commercial Lawn Care": {
    title: "Entretien paysager commercial",
    body: "Contrats pour les commerces, les propriétés industrielles et les copropriétés.",
  },
  "Property Maintenance": {
    title: "Entretien de propriété",
    body: "Entretien général, réparations et service sur appel.",
  },
  "Janitorial Services": {
    title: "Services de conciergerie",
    body: "Services complets d’entretien ménager pour les bureaux, les commerces et les établissements médicaux.",
  },
};

function ServicesPage() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main data-i18n-ignore="true">
        <PageHero
          eyebrow={t("Our Services", "Nos services")}
          title={t(
            "One team for every job around your home or business.",
            "Une équipe pour les travaux de votre maison ou de votre entreprise.",
          )}
          subtitle={t(
            "From weekly cleaning to seasonal snow contracts, we've got the crews, gear and coverage across Ottawa-Gatineau.",
            "Du nettoyage hebdomadaire aux contrats saisonniers de déneigement, nos équipes et notre équipement desservent Ottawa et Gatineau.",
          )}
        />

        {CATEGORIES.map((cat) => (
          <section key={cat.kind} className="py-16">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <h2 className="text-3xl font-bold text-navy">
                  {t(
                    `${cat.kind} Services`,
                    cat.kind === "Residential" ? "Services résidentiels" : "Services commerciaux",
                  )}
                </h2>
                <Button
                  asChild
                  className="h-auto min-h-11 whitespace-normal bg-accent px-4 py-3 text-accent-foreground hover:brightness-105"
                >
                  <Link to="/quote">
                    {t("Get a Free Quote", "Obtenir un devis gratuit")}{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((s) => (
                  <Card
                    key={s.title}
                    className="p-6 border-border/60 hover:shadow-soft transition-shadow"
                  >
                    <div className="h-11 w-11 rounded-lg bg-navy text-navy-foreground grid place-items-center">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-navy">
                      {t(s.title, FRENCH_SERVICES[s.title].title)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(s.body, FRENCH_SERVICES[s.title].body)}
                    </p>
                    <a
                      href={SERVICE_LINKS[s.title]}
                      className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 hover:underline"
                    >
                      {t("Learn more", "En savoir plus")}{" "}
                      <ArrowRight className="ml-1 h-4 w-4 shrink-0" />
                    </a>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
