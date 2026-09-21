import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { useLanguage } from "@/lib/language";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    seoHead({
      title: "Terms & Conditions | Ottawa Multiservices Group Inc.",
      description:
        "Clear terms for estimates, confirmed services, recurring cleaning, payments and cancellations in Ottawa and Gatineau.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const sections = [
    {
      id: "agreement",
      title: t(
        "1. Your request and service agreement",
        "1. Votre demande et le contrat de service",
      ),
      paragraphs: [
        t(
          "Ottawa Multiservices Group Inc. (OMSG) provides services in Ottawa, Gatineau and the surrounding areas confirmed in your quote. These terms explain how our website and service arrangements work.",
          "Ottawa Multiservices Group Inc. (OMSG) offre des services à Ottawa, à Gatineau et dans les secteurs environnants confirmés au devis. Les présentes conditions expliquent le fonctionnement du site et de nos prestations.",
        ),
        t(
          "Requesting a quote, using our calculator or sending photos is free and does not accept a service contract, reserve an appointment or authorize payment. Review the official quote, its included services, any service schedule or annex, and the applicable conditions before accepting. Your appointment is confirmed once the quote is accepted and the date and time are agreed.",
          "Demander un devis, utiliser le calculateur ou transmettre des photos est gratuit et ne vaut ni acceptation d’un contrat, ni réservation d’un rendez-vous, ni autorisation de paiement. Avant d’accepter, consultez le devis officiel, les prestations incluses, le calendrier ou l’annexe de service et les conditions applicables. Le rendez-vous est confirmé après acceptation du devis et accord sur la date et l’heure.",
        ),
        t(
          "The accepted official quote and its service-specific conditions define your agreed work. They take priority over general website descriptions if there is a difference, subject to your mandatory legal rights. Keep a copy of the quote and the conditions provided when you accept. Later website updates do not automatically change an existing agreement.",
          "Le devis officiel accepté et ses conditions particulières définissent le travail convenu. En cas de différence, ils prévalent sur les descriptions générales du site, sous réserve de vos droits légaux impératifs. Conservez une copie du devis et des conditions communiquées lors de l’acceptation. Une mise à jour ultérieure du site ne modifie pas automatiquement un contrat existant.",
        ),
      ],
    },
    {
      id: "prices",
      title: t(
        "2. Estimates, prices and included work",
        "2. Estimations, prix et prestations incluses",
      ),
      paragraphs: [
        t(
          "Online amounts are provisional estimates based on the information and options selected. We confirm the premises, tasks, frequency, products, access, price and applicable taxes in the official quote. Prices are in Canadian dollars; published cleaning rates are before tax unless expressly stated otherwise.",
          "Les montants en ligne sont des estimations provisoires fondées sur les renseignements et options choisis. Le devis officiel confirme les lieux, les tâches, la fréquence, les produits, l’accès, le prix et les taxes applicables. Les prix sont en dollars canadiens ; les tarifs de nettoyage publiés s’entendent avant taxes, sauf mention explicite contraire.",
        ),
        t(
          "An agreed fixed price remains fixed for the agreed scope. For hourly work, the rate, approved time budget and any minimum are confirmed in advance. We request your approval before additional work or charges; discovering extra work does not authorize us to increase an accepted price unilaterally. Estimated working times are planning estimates, not guaranteed completion times.",
          "Un forfait accepté reste fixe pour le périmètre convenu. Pour une prestation horaire, le taux, le budget de temps et tout minimum sont confirmés à l’avance. Votre accord est demandé avant des travaux ou frais supplémentaires ; la découverte de tâches additionnelles ne nous autorise pas à augmenter unilatéralement un prix accepté. Les durées estimées servent à la planification et ne garantissent pas un délai d’exécution.",
        ),
        t(
          "Routine cleaning prices include the agreed tasks, suitable cleaning products and everyday equipment. Commercial washroom consumables are supplied by the client or priced separately as agreed. Any exceptional travel or paid parking costs are confirmed and approved before work. Extras apply only on the visits specified in the quote. Specialist or unusual work, including major post-construction cleaning, mould or flood-related work, requires a free on-site assessment before an accurate quote and service availability can be confirmed.",
          "Les prix du nettoyage courant comprennent les tâches convenues, les produits adaptés et le matériel ordinaire. Les consommables sanitaires commerciaux sont fournis par le client ou chiffrés séparément selon l’accord. Tout frais de déplacement exceptionnel ou de stationnement payant est confirmé et accepté avant le travail. Les suppléments s’appliquent uniquement aux visites prévues au devis. Les interventions spécialisées ou atypiques, notamment après de gros travaux de construction, en présence de moisissures ou après une inondation, nécessitent une visite gratuite sur place avant de confirmer un devis précis et la disponibilité du service.",
        ),
      ],
    },
    {
      id: "recurring",
      title: t(
        "3. Recurring cleaning: the first four visits",
        "3. Nettoyage récurrent : les quatre premières visites",
      ),
      paragraphs: [
        t(
          "The published recurring cleaning rate is earned after four consecutive completed routine-cleaning visits at the agreed frequency. Visits 1, 2 and 3 are invoiced at the full rate shown in the quote. Visit 4 is invoiced at the agreed recurring rate, less the accumulated difference between the full and recurring rates for visits 1 to 3. From visit 5, the recurring rate applies while the agreed schedule and scope continue.",
          "Le tarif récurrent publié est acquis après quatre visites consécutives d’entretien courant réalisées selon la fréquence convenue. Les visites 1, 2 et 3 sont facturées au tarif complet indiqué au devis. La visite 4 est facturée au tarif récurrent convenu, moins la différence cumulée entre le tarif complet et le tarif récurrent des visites 1 à 3. Dès la visite 5, le tarif récurrent s’applique tant que la fréquence et les prestations convenues sont maintenues.",
        ),
        t(
          "This is an initial qualification period, not a repeating four-invoice cycle. The quote shows the planned amount for each visit and the fourth-visit credit. Applicable taxes are calculated on the amounts billed. An initial deep clean or specialist restoration is quoted separately and does not count toward this routine-cleaning credit. Extras follow the visit frequency stated in your quote and are not automatically discounted.",
          "Cette condition s’applique au démarrage, et non par cycles répétés de quatre factures. Le devis présente le montant prévu pour chaque visite et le crédit de la quatrième visite. Les taxes applicables sont calculées sur les montants facturés. Un nettoyage initial en profondeur ou une remise en état spécialisée fait l’objet d’un devis distinct et n’entre pas dans ce crédit d’entretien courant. Les suppléments suivent la fréquence prévue au devis et ne bénéficient pas automatiquement d’une réduction.",
        ),
        t(
          "A reschedule agreed with us, or a change initiated by OMSG, does not by itself break the sequence or remove eligibility. Tell us if you need to pause, change frequency or stop service so that we can confirm the effect on future visits in writing. If the service ends before four qualifying visits are completed, the fourth-visit credit has not yet been earned; this condition does not itself create an additional cancellation fee or a charge for unperformed visits. Your mandatory cancellation and refund rights remain unaffected.",
          "Un report convenu avec nous, ou un changement à l’initiative d’OMSG, ne rompt pas à lui seul la séquence et ne supprime pas l’admissibilité. Prévenez-nous pour une pause, un changement de fréquence ou un arrêt afin de confirmer par écrit les conséquences sur les visites à venir. Si le service prend fin avant quatre visites admissibles réalisées, le crédit de la quatrième visite n’est pas encore acquis ; cette condition ne crée pas à elle seule de frais d’annulation supplémentaires ni de facturation de visites non réalisées. Vos droits impératifs d’annulation et de remboursement restent applicables.",
        ),
      ],
    },
    {
      id: "payment",
      title: t("4. Invoices and payment", "4. Factures et paiement"),
      paragraphs: [
        t(
          "Accepted payment methods, due dates, any deposit and any commercial invoicing arrangement are stated in the official quote or service agreement before acceptance. Monthly billing or 30-day payment terms are not automatic. Please contact us promptly if you believe an invoice is incorrect.",
          "Les moyens de paiement acceptés, les échéances, tout acompte et les modalités de facturation commerciale sont précisés au devis officiel ou au contrat avant acceptation. Une facturation mensuelle ou un délai de 30 jours ne sont pas automatiques. Contactez-nous rapidement si une facture vous semble incorrecte.",
        ),
        t(
          "No contractual late-payment interest or additional fee is added unless its terms were disclosed and agreed in advance and are permitted by applicable law. Any agreed interest provision must specify the annual rate, when it starts and how it is calculated. These general terms do not themselves impose a late-payment interest rate.",
          "Aucun intérêt contractuel de retard ni frais additionnel n’est ajouté sans conditions annoncées et acceptées à l’avance et autorisées par la loi applicable. Toute clause d’intérêt convenue doit préciser le taux annuel, son point de départ et le mode de calcul. Les présentes conditions générales n’imposent pas, à elles seules, de taux d’intérêt de retard.",
        ),
      ],
    },
    {
      id: "changes",
      title: t(
        "5. Scheduling, changes and cancellations",
        "5. Rendez-vous, reports et annulations",
      ),
      paragraphs: [
        t(
          "One-time services may be rescheduled or cancelled without charge when you notify us at least 24 hours before the confirmed appointment. For recurring services, the cancellation and notice terms stated in your accepted service agreement apply. Any fee for shorter notice, missed access or a missed appointment must have been disclosed and accepted in advance; these general terms do not create an unspecified fee.",
          "Une prestation ponctuelle peut être reportée ou annulée sans frais si vous nous prévenez au moins 24 heures avant le rendez-vous confirmé. Pour les prestations récurrentes, les modalités d’annulation et de préavis du contrat accepté s’appliquent. Tout frais pour préavis plus court, absence d’accès ou rendez-vous manqué doit avoir été annoncé et accepté à l’avance ; les présentes conditions ne créent aucun frais indéterminé.",
        ),
        t(
          "If OMSG needs to change an appointment because of weather, safety or an operational issue, we contact you to agree on the next step. You are not charged a cancellation fee for a change initiated by us. If we cannot provide the agreed service, amounts already paid for that unperformed service are refunded unless you choose an agreed alternative. Statutory rights of cancellation, refund or other remedies remain available regardless of the 24-hour policy.",
          "Si OMSG doit modifier un rendez-vous pour des raisons météorologiques, de sécurité ou d’organisation, nous vous contactons pour convenir de la suite. Aucun frais d’annulation ne vous est imputé pour un changement à notre initiative. Si nous ne pouvons fournir la prestation convenue, les sommes déjà versées pour cette prestation non réalisée sont remboursées, sauf si vous choisissez une solution de remplacement convenue. Les droits légaux d’annulation, de remboursement ou autres recours restent applicables indépendamment de la politique de 24 heures.",
        ),
      ],
    },
    {
      id: "access",
      title: t("6. Access, safety and service quality", "6. Accès, sécurité et qualité du service"),
      paragraphs: [
        t(
          "Please provide accurate service information and arrange safe access, agreed water and electricity access, and a clear working area. Tell us about delicate surfaces, allergies, hazards or special instructions before work starts. Keep pets safely away from the work area. If conditions prevent safe completion, we contact you before agreeing on a change to the service.",
          "Fournissez des renseignements exacts et prévoyez un accès sécuritaire, l’eau et l’électricité convenues ainsi qu’une zone de travail dégagée. Signalez les surfaces délicates, allergies, dangers ou consignes particulières avant l’intervention. Gardez les animaux à l’écart. Si les conditions empêchent une exécution sécuritaire, nous vous contactons avant de convenir d’une modification du service.",
        ),
        t(
          "OMSG employees assigned to cleaning are trained for their tasks and have undergone criminal background checks. A completed follow-up checklist is sent after each cleaning intervention. Before-and-after quality photos require your prior permission and are included in your private report; refusing photos does not prevent service. Public or advertising use requires separate permission.",
          "Les employés d’OMSG affectés au nettoyage sont formés à leurs tâches et ont fait l’objet d’une vérification des antécédents judiciaires. Une checklist de suivi complétée est transmise après chaque intervention de nettoyage. Les photos qualité avant et après nécessitent votre autorisation préalable et accompagnent votre rapport privé ; leur refus n’empêche pas la prestation. Une utilisation publique ou publicitaire nécessite un accord distinct.",
        ),
        t(
          "Contact us as soon as reasonably possible about incomplete work, damage or another concern, with the relevant details. We review the situation with you and discuss an appropriate response. These terms do not limit liability to the service price or exclude responsibilities, guarantees or remedies that cannot lawfully be excluded. Ask us for information about insurance relevant to your proposed service before accepting the quote.",
          "Contactez-nous dès que raisonnablement possible en cas de travail incomplet, de dommage ou d’autre difficulté, avec les détails utiles. Nous examinons la situation avec vous et discutons de la réponse appropriée. Les présentes conditions ne limitent pas la responsabilité au prix du service et n’excluent pas les responsabilités, garanties ou recours auxquels la loi interdit de déroger. Vous pouvez demander les renseignements d’assurance pertinents pour la prestation envisagée avant d’accepter le devis.",
        ),
      ],
    },
    {
      id: "rights",
      title: t(
        "7. Your information and applicable rights",
        "7. Vos renseignements et les droits applicables",
      ),
      paragraphs: [
        t(
          "Our privacy policy explains how we handle personal information, optional photos and advertising preferences. Permission to perform a service is separate from permission to use your photos for advertising or send promotional messages.",
          "Notre politique de confidentialité explique le traitement des renseignements personnels, des photos facultatives et des préférences publicitaires. L’accord pour une prestation est distinct de l’autorisation d’utiliser vos photos à des fins publicitaires ou d’envoyer des messages promotionnels.",
        ),
        t(
          "Applicable Canadian federal law and the provincial rules relevant to your agreement apply. Consumers retain the mandatory protections and remedies available to them, including those applicable in Ontario or Quebec. Nothing in these terms requires a consumer to waive a legal right, use a prohibited dispute procedure or accept a choice of law that deprives them of mandatory protection.",
          "Le droit fédéral canadien applicable et les règles provinciales pertinentes au contrat s’appliquent. Les consommateurs conservent les protections et recours impératifs dont ils bénéficient, notamment ceux applicables en Ontario ou au Québec. Aucune disposition n’impose au consommateur de renoncer à un droit légal, de suivre une procédure de règlement interdite ou d’accepter un choix de droit qui le priverait d’une protection impérative.",
        ),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main data-i18n-ignore="true">
        <PageHero
          eyebrow={t("Clear agreements", "Des engagements clairs")}
          title={t("Terms & Conditions", "Conditions générales")}
          subtitle={t(
            "What to expect before booking, during your service and when you receive an invoice.",
            "Les informations utiles avant la réservation, pendant la prestation et à la réception de votre facture.",
          )}
        />
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
          <p className="text-sm text-slate-500">
            {t("Last updated: September 21, 2026", "Dernière mise à jour : 21 septembre 2026")}
          </p>
          <div className="mt-6 grid gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-5 sm:grid-cols-3 sm:p-6">
            {[
              t("A free request, with no commitment", "Une demande gratuite, sans engagement"),
              t("Your price confirmed before work", "Votre prix confirmé avant le travail"),
              t("Extras only with your approval", "Des suppléments uniquement avec votre accord"),
            ].map((text) => (
              <p key={text} className="flex gap-2 text-sm font-semibold leading-6 text-teal-950">
                <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                {text}
              </p>
            ))}
          </div>
          <nav
            aria-label={t("On this page", "Sur cette page")}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-b border-slate-200 pb-7 text-sm"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="font-medium text-teal-800 underline decoration-teal-200 underline-offset-4 hover:decoration-teal-800"
              >
                {section.title.replace(/^\d+\. /, "")}
              </a>
            ))}
          </nav>
          <div className="divide-y divide-slate-200">
            {sections.map((section) => (
              <section id={section.id} key={section.id} className="scroll-mt-28 py-8">
                <h2 className="text-xl font-bold leading-7 text-slate-900 sm:text-2xl">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="mt-4 text-base leading-8 text-slate-600">
                    {paragraph}
                  </p>
                ))}
                {section.id === "recurring" && (
                  <Link
                    to="/pricing-policy"
                    hash="savings"
                    className="mt-4 inline-flex items-center gap-2 font-semibold text-teal-800 underline underline-offset-4"
                  >
                    {t(
                      "See the pricing policy and example",
                      "Voir la politique des prix et l’exemple",
                    )}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                )}
              </section>
            ))}
          </div>
          <aside className="mt-3 rounded-2xl bg-slate-50 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {t("A question about your agreement?", "Une question sur votre contrat ?")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Ottawa Multiservices Group Inc. · Ottawa / Gatineau
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-teal-800">
              <a
                className="break-all underline underline-offset-4"
                href="mailto:info@ottawamultiservicesgroup.com"
              >
                info@ottawamultiservicesgroup.com
              </a>
              <a href="tel:+16134076699">(613) 407-6699</a>
            </div>
          </aside>
          <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-teal-800">
            <Link to="/pricing-policy" className="underline underline-offset-4">
              {t("Pricing policy", "Politique des prix")}
            </Link>
            <Link to="/privacy" className="underline underline-offset-4">
              {t("Privacy policy", "Politique de confidentialité")}
            </Link>
            <Link to="/faq" className="underline underline-offset-4">
              {t("Frequently asked questions", "Questions fréquentes")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
