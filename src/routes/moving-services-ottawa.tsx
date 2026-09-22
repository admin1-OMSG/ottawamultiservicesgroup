import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = "Moving Services Ottawa | Local Moving Help | OMSG";
const description =
  "Local moving services in Ottawa including loading, unloading, packing support and residential moving assistance.";
export const Route = createFileRoute("/moving-services-ottawa")({
  head: () => ({
    ...seoHead({ title, description, path: "/moving-services-ottawa" }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Local Moving Services in Ottawa",
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
        eyebrow: "Moving Services",
        title: "Local Moving Services in Ottawa",
        intro:
          "Flexible moving help for local residential moves, loading, unloading and packing support.",
        bullets: [
          "Local residential moves",
          "Loading and unloading",
          "Packing support",
          "Furniture moving assistance",
          "Move-in and move-out support",
        ],
        localText:
          "We support local moves across Ottawa and nearby communities. Quote details depend on access, volume, distance and crew requirements.",
      }}
      frenchContent={{
        eyebrow: "Services de déménagement",
        title: "Aide au déménagement local à Ottawa",
        intro:
          "Une aide adaptée à vos besoins pour les déménagements résidentiels locaux, le chargement, le déchargement et l’emballage.",
        bullets: [
          "Déménagements résidentiels locaux",
          "Chargement et déchargement",
          "Aide à l’emballage",
          "Aide au déplacement des meubles",
          "Aide à l’emménagement et au déménagement",
        ],
        localText:
          "Nous vous accompagnons dans vos déménagements locaux à Ottawa et dans les communautés voisines. Le devis dépend de l’accès, du volume, de la distance et de l’équipe nécessaire.",
      }}
    />
  ),
});
