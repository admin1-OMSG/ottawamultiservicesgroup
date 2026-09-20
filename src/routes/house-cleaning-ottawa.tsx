import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";
const title = "House Cleaning Ottawa & Gatineau | OMSG";
const description =
  "Reliable cleaning for homes, apartments and rentals in Ottawa and Gatineau. Choose once-a-week, every-14-days or monthly service; other weekly frequencies receive a revised quote.";
export const Route = createFileRoute("/house-cleaning-ottawa")({
  head: () => ({
    ...seoHead({ title, description, path: "/house-cleaning-ottawa" }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "House Cleaning Ottawa & Gatineau | OMSG",
          description,
          areaServed: [
            "Ottawa",
            "Gatineau",
            "Kanata",
            "Nepean",
            "Barrhaven",
            "Orléans",
            "Gloucester",
            "Stittsville",
          ],
          provider: {
            "@type": "LocalBusiness",
            name: "Ottawa Multiservices Group Inc.",
            url: absoluteUrl("/"),
          },
        }),
      },
    ],
  }),
  component: () => (
    <ServiceSeoPage
      pricingPath="/pricing/residential"
      content={{
        eyebrow: "Residential Cleaning",
        title: "House Cleaning Services in Ottawa and Gatineau",
        intro:
          "Reliable cleaning for homes, apartments and rentals in Ottawa and Gatineau. Choose once-a-week, every-14-days or monthly service; other weekly frequencies receive a revised quote.",
        bullets: [
          "Regular and recurring house cleaning",
          "Deep cleaning",
          "Move-in and move-out cleaning",
          "Airbnb and rental turnover cleaning",
          "Post-construction cleaning",
        ],
        localText:
          "We serve Ottawa, Gatineau, Kanata, Nepean, Barrhaven, Orléans, Gloucester and Stittsville. Two or more visits a week, daily visits and other schedules can be quoted at a revised rate. Specialist work requires a free on-site assessment.",
      }}
      frenchContent={{
        eyebrow: "Nettoyage résidentiel",
        title: "Nettoyage résidentiel à Ottawa et Gatineau",
        intro:
          "Un nettoyage fiable des maisons, appartements et logements locatifs à Ottawa et Gatineau. Choisissez une visite par semaine, tous les 14 jours ou chaque mois ; les autres fréquences hebdomadaires font l’objet d’un tarif révisé.",
        bullets: [
          "Entretien résidentiel courant et récurrent",
          "Nettoyage en profondeur",
          "Nettoyage à l’entrée et à la sortie",
          "Nettoyage entre locations et séjours Airbnb",
          "Nettoyage après construction",
        ],
        localText:
          "Nous desservons Ottawa, Gatineau, Kanata, Nepean, Barrhaven, Orléans, Gloucester et Stittsville. Deux passages par semaine ou plus, un entretien quotidien et d’autres rythmes peuvent être proposés à un tarif révisé. Les prestations spécialisées nécessitent une visite gratuite sur site.",
      }}
    />
  ),
});
