import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/lib/language";
import { seoHead } from "@/lib/seo";

type FaqItem = { id: string; q: { en: string; fr: string }; a: { en: string; fr: string } };
type FaqGroup = { id: string; title: { en: string; fr: string }; items: FaqItem[] };

const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "prices",
    title: {
      en: "Prices, quotes and recurring visits",
      fr: "Tarifs, devis et visites récurrentes",
    },
    items: [
      {
        id: "rates",
        q: {
          en: "Where can I see your prices and what is included?",
          fr: "Où consulter vos prix et les prestations incluses ?",
        },
        a: {
          en: "Our residential and commercial cleaning pricing pages show the packages, included tasks, optional extras and applicable limits. Prices are in Canadian dollars before tax unless stated otherwise. The calculator shows an indicative total with applicable taxes. Your official quote confirms the services included at each visit, the frequency of any extras and the final price before you accept.",
          fr: "Nos pages de tarifs résidentiels et commerciaux présentent les forfaits, les tâches incluses, les suppléments et leurs limites. Les prix sont en dollars canadiens avant taxes, sauf mention contraire. Le calculateur affiche un total indicatif avec les taxes applicables. Le devis officiel confirme les prestations de chaque visite, la fréquence des suppléments et le prix final avant votre acceptation.",
        },
      },
      {
        id: "request",
        q: {
          en: "Does requesting a quote commit me to a booking?",
          fr: "Une demande de devis m’engage-t-elle à réserver ?",
        },
        a: {
          en: "No. Requesting a quote is free and does not accept a contract, reserve a time slot or take payment. The online estimate is provisional. We review your information and prepare an official quote. Your appointment is confirmed after you accept that quote and agree on a date and time. A fixed price remains fixed for the agreed scope; extra work or charges require your approval.",
          fr: "Non. La demande de devis est gratuite et ne vaut ni acceptation d’un contrat, ni réservation de créneau, ni paiement. L’estimation en ligne est provisoire. Nous vérifions vos renseignements et préparons le devis officiel. Le rendez-vous est confirmé après acceptation de ce devis et accord sur la date et l’heure. Le forfait reste fixe pour le périmètre convenu ; tout travail ou frais supplémentaire nécessite votre accord.",
        },
      },
      {
        id: "four-visits",
        q: {
          en: "How does the recurring rate apply to my first four invoices?",
          fr: "Comment le tarif récurrent s’applique-t-il aux quatre premières factures ?",
        },
        a: {
          en: "The recurring rate is earned after four consecutive completed routine-cleaning visits at your agreed frequency. Visits 1, 2 and 3 are billed at the full rate. Visit 4 is billed at the recurring rate, minus the accumulated difference between the full and recurring rates for visits 1 to 3. From visit 5, the recurring rate applies while the agreed frequency and scope continue. This initial condition does not restart every four visits. Your official quote shows the planned amount for each visit and the credit. Separately quoted deep cleaning is outside this credit; extras follow the frequency and prices confirmed in your quote.",
          fr: "Le tarif récurrent est acquis après quatre visites consécutives d’entretien courant réalisées selon la fréquence convenue. Les visites 1, 2 et 3 sont facturées au tarif complet. La visite 4 est facturée au tarif récurrent, moins la différence cumulée entre le tarif complet et le tarif récurrent des visites 1 à 3. Dès la visite 5, le tarif récurrent s’applique tant que la fréquence et les prestations convenues sont maintenues. Cette condition initiale ne recommence pas toutes les quatre visites. Le devis officiel présente le montant prévu pour chaque visite et le crédit. Le nettoyage en profondeur chiffré séparément est exclu de ce crédit ; les suppléments suivent les fréquences et prix du devis.",
        },
      },
      {
        id: "frequency",
        q: {
          en: "Can I book more than one cleaning visit per week?",
          fr: "Puis-je prévoir plusieurs nettoyages par semaine ?",
        },
        a: {
          en: "Yes. Weekly means one visit every 7 days; every two weeks means one visit every 14 days. Two or more visits per week, daily cleaning and other schedules can be arranged. We review the rate and package for your requested frequency, tasks and premises and confirm availability in the quote. An agreed reschedule or a change initiated by OMSG does not by itself interrupt your four-visit qualification.",
          fr: "Oui. Le rythme hebdomadaire correspond à une visite tous les 7 jours ; toutes les deux semaines, à une visite tous les 14 jours. Deux passages par semaine ou plus, un entretien quotidien et d’autres rythmes peuvent être organisés. Le tarif et le forfait sont révisés selon la fréquence, les tâches et les lieux, avec confirmation de disponibilité au devis. Un report convenu ou un changement à l’initiative d’OMSG n’interrompt pas à lui seul votre admissibilité au programme des quatre visites.",
        },
      },
    ],
  },
  {
    id: "service",
    title: { en: "What to expect from your cleaning", fr: "Le déroulement de votre nettoyage" },
    items: [
      {
        id: "supplies",
        q: {
          en: "Are cleaning products and equipment included?",
          fr: "Les produits et le matériel de nettoyage sont-ils inclus ?",
        },
        a: {
          en: "Yes. Routine cleaning includes suitable products and everyday equipment such as cloths, a vacuum, a mop and small tools. Commercial washroom consumables such as toilet paper, paper towels, user soap and bin liners are supplied by the client or priced separately. Replenishing accessible dispensers is included in the agreed commercial cleaning scope. Tell us about allergies, delicate surfaces or specific product requests so that we can confirm any change before work starts. Water and electricity must be available as agreed.",
          fr: "Oui. Le nettoyage courant comprend les produits adaptés et le matériel ordinaire : chiffons, aspirateur, vadrouille et petits outils. Les consommables sanitaires commerciaux — papier hygiénique, essuie-mains, savon des usagers et sacs — sont fournis par le client ou chiffrés séparément. Le réapprovisionnement des distributeurs accessibles est compris dans le périmètre commercial convenu. Signalez les allergies, surfaces délicates ou produits particuliers souhaités pour confirmer tout changement avant le travail. L’eau et l’électricité doivent être accessibles selon l’accord.",
        },
      },
      {
        id: "extras",
        q: {
          en: "Will my selected extras be repeated at every visit?",
          fr: "Les suppléments choisis sont-ils répétés à chaque visite ?",
        },
        a: {
          en: "For recurring cleaning, selected extras default to the first visit only. Choose Every visit if you want an extra repeated, including on the first visit. The official quote confirms this choice for each extra. A bundle saving applies only on visits where the bundled services are both performed. For a one-time service, selected extras apply to that single visit.",
          fr: "Pour un nettoyage récurrent, les suppléments sont proposés par défaut pour la première visite seulement. Choisissez À chaque visite pour répéter une option, première visite comprise. Le devis officiel confirme ce choix pour chaque supplément. Une remise groupée s’applique uniquement aux visites où les deux prestations concernées sont réalisées. Pour une prestation ponctuelle, les suppléments choisis concernent cette visite unique.",
        },
      },
      {
        id: "photos",
        q: {
          en: "Do I have to provide photos or authorize before-and-after pictures?",
          fr: "Dois-je fournir des photos ou autoriser des prises de vue avant et après ?",
        },
        a: {
          en: "No. Photos with your quote request are helpful but optional. Before-and-after photos during the service require a separate, optional authorization that you can change before pictures are taken. They are used for your private service record and quality report. Advertising or public sharing requires separate permission. Refusing photos does not prevent you from receiving cleaning service.",
          fr: "Non. Les photos jointes à la demande de devis sont utiles mais facultatives. Les photos avant et après pendant l’intervention nécessitent une autorisation distincte et facultative, modifiable avant les prises de vue. Elles servent au dossier de prestation et à votre rapport qualité privé. Toute publicité ou diffusion publique nécessite un accord distinct. Refuser les photos ne vous empêche pas de bénéficier du nettoyage.",
        },
      },
      {
        id: "quality",
        q: {
          en: "How do you follow up on service quality?",
          fr: "Comment assurez-vous le suivi de la qualité ?",
        },
        a: {
          en: "OMSG employees assigned to cleaning are trained for their tasks and have undergone criminal background checks. After each cleaning intervention, a completed checklist records the agreed tasks, work completed and any observations and is sent to you. Authorized quality photos accompany your private report. Contact us if something needs attention so that we can review it with you.",
          fr: "Les employés d’OMSG affectés au nettoyage sont formés à leurs tâches et ont fait l’objet d’une vérification des antécédents judiciaires. Après chaque intervention de nettoyage, une checklist complétée indique les tâches convenues, les travaux réalisés et les observations ; elle vous est transmise. Les photos qualité autorisées accompagnent votre rapport privé. Signalez-nous tout point nécessitant une attention afin que nous l’examinions avec vous.",
        },
      },
      {
        id: "specialist",
        q: {
          en: "When is a free on-site assessment required?",
          fr: "Quand une visite gratuite sur place est-elle nécessaire ?",
        },
        a: {
          en: "An assessment is required for heavy or unusual work and services needing specialist equipment: major post-construction cleaning, mould, flooding or water damage, carpet and upholstery extraction, machine floor care and other specialist work. It lets us confirm the scope, an appropriate team and equipment, service availability and an accurate quote. Photos can help prepare the assessment but do not replace it for these jobs.",
          fr: "Une visite est nécessaire pour les travaux importants ou atypiques et les prestations nécessitant du matériel spécialisé : nettoyage après de gros travaux de construction, moisissures, inondations ou dégâts d’eau, extraction des tapis et tissus, entretien mécanisé des sols et autres travaux spécialisés. Elle permet de confirmer le périmètre, l’équipe et le matériel adaptés, la disponibilité du service et un devis précis. Les photos peuvent préparer cette visite mais ne la remplacent pas pour ces interventions.",
        },
      },
    ],
  },
  {
    id: "appointments",
    title: {
      en: "Appointments, access and service areas",
      fr: "Rendez-vous, accès et secteurs desservis",
    },
    items: [
      {
        id: "areas",
        q: {
          en: "Do you serve both Ottawa and Gatineau?",
          fr: "Desservez-vous Ottawa et Gatineau ?",
        },
        a: {
          en: "Yes. Our usual cleaning service area includes urban Ottawa and Gatineau, including Nepean, Orléans, Gloucester, Barrhaven, Kanata and Stittsville. We confirm availability for your address before booking. Standard travel in the agreed service area is included; any exceptional travel or paid parking costs are identified and agreed before work.",
          fr: "Oui. Notre zone habituelle de nettoyage comprend les secteurs urbains d’Ottawa et de Gatineau, notamment Nepean, Orléans, Gloucester, Barrhaven, Kanata et Stittsville. Nous confirmons la disponibilité à votre adresse avant la réservation. Le déplacement habituel dans le secteur convenu est inclus ; tout déplacement exceptionnel ou stationnement payant est annoncé et accepté avant le travail.",
        },
      },
      {
        id: "hours",
        q: {
          en: "Can you work on weekends or outside office hours?",
          fr: "Pouvez-vous intervenir le week-end ou en dehors des heures de bureau ?",
        },
        a: {
          en: "Ask us for your preferred day and time, including weekend or commercial after-hours service. Availability depends on the service, location, duration and team schedule. We confirm the appointment with you before booking; submitting a preferred date does not by itself reserve a time slot.",
          fr: "Indiquez le jour et l’horaire souhaités, y compris le week-end ou en dehors des heures d’ouverture de votre entreprise. La disponibilité dépend de la prestation, de l’adresse, de la durée et du planning de l’équipe. Le rendez-vous est confirmé avec vous avant la réservation ; l’envoi d’une date souhaitée ne réserve pas à lui seul un créneau.",
        },
      },
      {
        id: "access",
        q: {
          en: "Do I need to be present during the service?",
          fr: "Dois-je être présent pendant la prestation ?",
        },
        a: {
          en: "Not necessarily. We can agree on access instructions before the appointment. Make sure the agreed areas are accessible, water and electricity are available as required, and pets are safely away from the work area. Tell us about alarms, delicate surfaces, hazards or building rules. Avoid posting keys, door codes or other sensitive access details in public messages.",
          fr: "Pas nécessairement. Nous pouvons convenir des modalités d’accès avant le rendez-vous. Assurez-vous que les zones prévues sont accessibles, que l’eau et l’électricité nécessaires sont disponibles et que les animaux restent à l’écart. Signalez les alarmes, surfaces délicates, dangers ou règles de l’immeuble. Évitez de publier des clés, codes d’accès ou autres informations sensibles dans des messages publics.",
        },
      },
    ],
  },
  {
    id: "payment-and-changes",
    title: {
      en: "Payment, changes and practical questions",
      fr: "Paiement, changements et questions pratiques",
    },
    items: [
      {
        id: "cancel",
        q: {
          en: "Can I reschedule or cancel?",
          fr: "Puis-je reporter ou annuler une prestation ?",
        },
        a: {
          en: "For one-time services, notify us at least 24 hours before the confirmed appointment to reschedule or cancel without charge. Recurring services follow the terms of the accepted agreement. Any shorter-notice or missed-access fee must be disclosed and accepted in advance. An agreed reschedule or an OMSG-initiated change does not by itself remove four-visit eligibility. If recurring service ends before four qualifying visits are completed, the fourth-visit credit has not yet been earned. Your mandatory legal cancellation and refund rights still apply.",
          fr: "Pour une prestation ponctuelle, prévenez-nous au moins 24 heures avant le rendez-vous confirmé pour reporter ou annuler sans frais. Les services récurrents suivent les conditions du contrat accepté. Tout frais pour préavis plus court ou absence d’accès doit être annoncé et accepté à l’avance. Un report convenu ou un changement à l’initiative d’OMSG ne supprime pas à lui seul l’admissibilité aux quatre visites. Si le service récurrent cesse avant quatre visites admissibles réalisées, le crédit de la quatrième visite n’est pas encore acquis. Vos droits légaux impératifs d’annulation et de remboursement restent applicables.",
        },
      },
      {
        id: "payment",
        q: { en: "How and when do I pay?", fr: "Comment et quand dois-je payer ?" },
        a: {
          en: "Your official quote or service agreement confirms the accepted payment methods, due date and any deposit before you accept. Commercial monthly billing and 30-day terms are available only when expressly agreed. Your invoice identifies the services, applicable taxes and any agreed recurring-service credit. Contact us if you need a payment method or billing arrangement confirmed before booking.",
          fr: "Le devis officiel ou le contrat confirme les moyens de paiement acceptés, l’échéance et tout acompte avant votre acceptation. La facturation commerciale mensuelle et un délai de 30 jours s’appliquent uniquement s’ils sont expressément convenus. La facture détaille les prestations, les taxes applicables et tout crédit récurrent convenu. Contactez-nous pour confirmer un moyen de paiement ou une modalité de facturation avant la réservation.",
        },
      },
      {
        id: "insurance",
        q: {
          en: "Can I ask for insurance information before booking?",
          fr: "Puis-je demander les renseignements d’assurance avant de réserver ?",
        },
        a: {
          en: "Yes. Ask us for the insurance information relevant to the proposed service and the assigned provider before you accept the quote. Coverage depends on the policy and the type of work. A criminal background check is different from bonding and does not itself establish insurance coverage.",
          fr: "Oui. Demandez les renseignements d’assurance pertinents pour la prestation envisagée et l’intervenant prévu avant d’accepter le devis. La couverture dépend du contrat d’assurance et du type de travaux. Une vérification des antécédents judiciaires est différente d’un cautionnement et ne constitue pas, à elle seule, une assurance.",
        },
      },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    ...seoHead({
      title: "FAQ | Ottawa Multiservices Group Inc.",
      description:
        "Questions about cleaning prices, the four-visit recurring credit, included services, optional photos and appointments in Ottawa and Gatineau.",
      path: "/faq",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: "en-CA",
          mainEntity: FAQ_GROUPS.flatMap((group) => group.items).map((item) => ({
            "@type": "Question",
            name: item.q.en,
            acceptedAnswer: { "@type": "Answer", text: item.a.en },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main data-i18n-ignore="true">
        <PageHero
          eyebrow={t("Frequently asked questions", "Questions fréquentes")}
          title={t("Clear answers before you book.", "Des réponses claires avant de réserver.")}
          subtitle={t(
            "Prices, included services and practical details for your home or business in Ottawa and Gatineau.",
            "Tarifs, prestations incluses et informations pratiques pour votre maison ou votre entreprise à Ottawa et Gatineau.",
          )}
        />
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-5 sm:grid-cols-3 sm:p-6">
            {[
              t("Free quote requests", "Demandes de devis gratuites"),
              t("Products and everyday equipment included", "Produits et matériel courant inclus"),
              t("Photos are optional", "Photos facultatives"),
            ].map((text) => (
              <p key={text} className="flex gap-2 text-sm font-semibold leading-6 text-teal-950">
                <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                {text}
              </p>
            ))}
          </div>
          <nav
            aria-label={t("Question topics", "Rubriques des questions")}
            className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-teal-800"
          >
            {FAQ_GROUPS.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="underline decoration-teal-200 underline-offset-4 hover:decoration-teal-800"
              >
                {group.title[language]}
              </a>
            ))}
          </nav>
          <div className="mt-10 space-y-10">
            {FAQ_GROUPS.map((group) => (
              <section key={group.id} id={group.id} className="scroll-mt-28">
                <h2 className="mb-4 text-xl font-bold leading-7 text-slate-900 sm:text-2xl">
                  {group.title[language]}
                </h2>
                <Accordion
                  type="multiple"
                  className="rounded-2xl border border-slate-200 bg-white px-5 sm:px-6"
                >
                  {group.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="last:border-b-0">
                      <AccordionTrigger className="py-5 text-left text-base font-semibold leading-6 text-slate-900">
                        {item.q[language]}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-base leading-8 text-slate-600">
                        <p>{item.a[language]}</p>
                        {item.id === "rates" && (
                          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 font-semibold text-teal-800">
                            <Link
                              to="/pricing/residential"
                              className="underline underline-offset-4"
                            >
                              {t("Residential prices", "Tarifs résidentiels")}
                            </Link>
                            <Link to="/pricing/commercial" className="underline underline-offset-4">
                              {t("Commercial prices", "Tarifs commerciaux")}
                            </Link>
                          </div>
                        )}
                        {item.id === "four-visits" && (
                          <Link
                            to="/pricing-policy"
                            hash="savings"
                            className="mt-4 inline-flex font-semibold text-teal-800 underline underline-offset-4"
                          >
                            {t(
                              "See the policy and billing example",
                              "Voir la politique et l’exemple de facturation",
                            )}
                          </Link>
                        )}
                        {item.id === "photos" && (
                          <Link
                            to="/privacy"
                            className="mt-4 inline-flex font-semibold text-teal-800 underline underline-offset-4"
                          >
                            {t("Read our privacy policy", "Lire la politique de confidentialité")}
                          </Link>
                        )}
                        {item.id === "cancel" && (
                          <Link
                            to="/terms"
                            hash="changes"
                            className="mt-4 inline-flex font-semibold text-teal-800 underline underline-offset-4"
                          >
                            {t("Read the cancellation terms", "Lire les conditions d’annulation")}
                          </Link>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
          <aside className="mt-12 rounded-2xl bg-teal-950 p-6 text-white sm:p-8">
            <h2 className="text-xl font-bold">
              {t("Ready to tell us what you need?", "Prêt à nous parler de votre besoin ?")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-teal-50">
              {t(
                "Choose residential or commercial cleaning to see the packages and request your official quote.",
                "Choisissez le nettoyage résidentiel ou commercial pour consulter les forfaits et demander votre devis officiel.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-5">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-teal-950"
              >
                {t("See prices and request a quote", "Voir les prix et demander un devis")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <a href="tel:+16134076699" className="text-sm font-semibold text-white">
                (613) 407-6699
              </a>
            </div>
          </aside>
          <div className="mt-7 flex flex-wrap gap-5 text-sm font-semibold text-teal-800">
            <Link to="/terms" className="underline underline-offset-4">
              {t("Terms & Conditions", "Conditions générales")}
            </Link>
            <Link to="/pricing-policy" className="underline underline-offset-4">
              {t("Pricing policy", "Politique des prix")}
            </Link>
            <Link to="/privacy" className="underline underline-offset-4">
              {t("Privacy policy", "Politique de confidentialité")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
