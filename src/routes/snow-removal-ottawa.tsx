import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = "Snow Removal Ottawa | Residential & Commercial | OMSG";
const description =
  "Snow removal in Ottawa for driveways, walkways and commercial properties. Per-visit and seasonal service options.";
export const Route = createFileRoute("/snow-removal-ottawa")({
  head: () => ({
    ...seoHead({ title, description, path: "/snow-removal-ottawa" }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Snow Removal Services in Ottawa",
          description,
          areaServed: [
            "Ottawa",
            "Kanata",
            "Nepean",
            "Barrhaven",
            "Orleans",
            "Stittsville",
            "Gatineau",
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
      content={{
        eyebrow: "Snow Removal",
        title: "Snow Removal Services in Ottawa",
        intro:
          "Winter snow clearing for residential and commercial properties, with service options based on your property and schedule.",
        bullets: [
          "Driveway snow clearing",
          "Walkway clearing",
          "Residential seasonal service",
          "Commercial snow removal",
          "Salting and winter property support",
        ],
        localText:
          "Ottawa winters demand reliable local coverage. Service availability and response depend on snowfall, location and contract terms.",
      }}
      frenchContent={{
        eyebrow: "Déneigement",
        title: "Services de déneigement à Ottawa",
        intro:
          "Le déneigement hivernal des propriétés résidentielles et commerciales, avec des options adaptées à votre propriété et à votre calendrier.",
        bullets: [
          "Déneigement des entrées",
          "Déneigement des allées piétonnes",
          "Service résidentiel saisonnier",
          "Déneigement commercial",
          "Épandage de sel et entretien hivernal de la propriété",
        ],
        localText:
          "Les hivers d’Ottawa exigent un service local fiable. La disponibilité et les délais d’intervention dépendent des chutes de neige, de l’emplacement et des conditions du contrat.",
      }}
    />
  ),
});
