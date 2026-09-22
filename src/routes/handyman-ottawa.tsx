import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = "Handyman Ottawa | Small Repairs & Property Maintenance | OMSG";
const description =
  "Small repairs, assembly, mounting and property maintenance services in Ottawa for homes and businesses.";
export const Route = createFileRoute("/handyman-ottawa")({
  head: () => ({
    ...seoHead({ title, description, path: "/handyman-ottawa" }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Handyman & Small Repair Services in Ottawa",
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
        eyebrow: "Repairs & Maintenance",
        title: "Handyman & Small Repair Services in Ottawa",
        intro:
          "Practical help with smaller property jobs that do not require a specialized licensed trade.",
        bullets: [
          "Furniture assembly",
          "Mounting and installation",
          "Minor repairs and touch-ups",
          "General property maintenance",
          "Small improvement projects",
        ],
        localText:
          "Tell us what needs to be done and include photos in your quote request so we can confirm whether the work fits our service scope.",
      }}
      frenchContent={{
        eyebrow: "Réparations et entretien",
        title: "Petits travaux et réparations à Ottawa",
        intro:
          "Une aide pratique pour les petits travaux de propriété qui ne nécessitent pas l’intervention d’un professionnel spécialisé titulaire d’un permis.",
        bullets: [
          "Assemblage de meubles",
          "Fixation et installation",
          "Petites réparations et retouches",
          "Entretien général de la propriété",
          "Petits projets d’amélioration",
        ],
        localText:
          "Décrivez les travaux à effectuer et joignez des photos à votre demande de devis pour nous aider à confirmer s’ils correspondent aux services que nous offrons.",
      }}
    />
  ),
});
