import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";
const title = "Commercial Cleaning Ottawa & Gatineau | OMSG";
const description =
  "Flexible cleaning for offices, shops and managed properties in Ottawa and Gatineau. Other weekly frequencies are available, with rates reviewed for the schedule and tasks.";
export const Route = createFileRoute("/commercial-cleaning-ottawa")({
  head: () => ({
    ...seoHead({ title, description, path: "/commercial-cleaning-ottawa" }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Commercial Cleaning Ottawa & Gatineau | OMSG",
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
      pricingPath="/pricing/commercial"
      content={{
        eyebrow: "Commercial Cleaning",
        title: "Commercial Cleaning in Ottawa and Gatineau",
        intro:
          "Flexible cleaning for offices, shops and managed properties in Ottawa and Gatineau. Other weekly frequencies are available, with rates reviewed for the schedule and tasks.",
        bullets: [
          "Office cleaning",
          "Janitorial service",
          "Retail and common-area cleaning",
          "Post-construction commercial cleaning",
          "Custom recurring cleaning schedules",
        ],
        localText:
          "We serve Ottawa, Gatineau, Kanata, Nepean, Barrhaven, Orléans, Gloucester and Stittsville. Two or more visits a week, daily visits and other schedules can be quoted at a revised rate. Specialist work requires a free on-site assessment.",
      }}
      frenchContent={{
        eyebrow: "Nettoyage commercial",
        title: "Nettoyage commercial à Ottawa et Gatineau",
        intro:
          "Un entretien adapté aux bureaux, commerces et immeubles gérés à Ottawa et Gatineau. D’autres fréquences hebdomadaires sont possibles, avec un tarif révisé selon le calendrier et les tâches.",
        bullets: [
          "Nettoyage de bureaux",
          "Entretien ménager commercial",
          "Nettoyage des commerces et parties communes",
          "Nettoyage commercial après construction",
          "Calendriers de nettoyage récurrent sur mesure",
        ],
        localText:
          "Nous desservons Ottawa, Gatineau, Kanata, Nepean, Barrhaven, Orléans, Gloucester et Stittsville. Deux passages par semaine ou plus, un entretien quotidien et d’autres rythmes peuvent être proposés à un tarif révisé. Les prestations spécialisées nécessitent une visite gratuite sur site.",
      }}
    />
  ),
});
