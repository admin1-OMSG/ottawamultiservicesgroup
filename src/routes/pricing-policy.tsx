import { useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language";
import { seoHead } from "@/lib/seo";
import { PRICING_VERSION, FREQUENCY_NOTE, SERVICE_AREA } from "@/lib/cleaning-pricing";

export const Route = createFileRoute("/pricing-policy")({
  head: () =>
    seoHead({
      title: "Cleaning Pricing and Quality Policy | OMSG",
      description:
        "Cleaning in Ottawa and Gatineau: package savings, tailored frequencies, included tasks, quality checklists and optional photographs.",
      path: "/pricing-policy",
    }),
  component: PricingPolicy,
});

function PricingPolicy() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  useEffect(() => {
    const openLinkedSection = () => {
      const section = document.getElementById(window.location.hash.slice(1));
      if (section instanceof HTMLDetailsElement) section.open = true;
    };
    openLinkedSection();
    window.addEventListener("hashchange", openLinkedSection);
    return () => window.removeEventListener("hashchange", openLinkedSection);
  }, []);
  const sections = [
    {
      id: "included",
      title: t("What our prices include", "Ce que nos prix comprennent"),
      body: [
        t(
          "Our prices include the agreed cleaning work, suitable cleaning products and everyday equipment: cloths, vacuum, mop and small tools. Usual travel within urban Ottawa, Gatineau, Nepean, Orléans, Gloucester, Barrhaven, Kanata and Stittsville is included. We confirm service availability and any extra travel or paid parking costs before you agree.",
          "Nos prix comprennent le travail convenu, les produits adaptés et le matériel courant : chiffons, aspirateur, vadrouille et petits outils. Le déplacement habituel dans les secteurs urbains d’Ottawa, de Gatineau, de Nepean, d’Orléans, de Gloucester, de Barrhaven, de Kanata et de Stittsville est inclus. Disponibilité, déplacement exceptionnel et stationnement payant sont confirmés avant votre accord.",
        ),
        t(
          "Commercial washroom supplies such as toilet paper, paper towels, user soap and bin liners are client-supplied or priced separately. Replenishing accessible dispensers is included. Please tell us about allergies, delicate surfaces or requested products.",
          "Les consommables commerciaux — papier hygiénique, essuie-mains, savon des usagers et sacs — sont fournis par le client ou chiffrés séparément. Le réapprovisionnement des distributeurs accessibles est inclus. Signalez les allergies, surfaces délicates ou produits souhaités.",
        ),
      ],
    },
    {
      id: "estimate",
      title: t("Your estimate and official quote", "Votre estimation et le devis officiel"),
      body: [
        t(
          "The online calculator provides a provisional fixed-price estimate using your selected property profile, estimated worker-hours and options. These planning times are estimates, not guaranteed completion times. Large or unusual premises, heavy soil or specialist work require a free on-site assessment.",
          "Le calculateur fournit une estimation provisoire au forfait selon le profil choisi, les heures-personnes estimées et les options. Ces durées sont indicatives ; elles ne garantissent pas un délai d’exécution. Les lieux importants ou atypiques, l’encrassement exceptionnel et les travaux spécialisés nécessitent une visite gratuite.",
        ),
        t(
          "Book now opens a request for an official quote. We review your information and confirm the rooms, tasks, products, price, taxes, access and schedule. Submitting the form does not accept a quote, reserve a time slot or take payment. Your appointment is confirmed after you accept the official quote and agree on a date.",
          "Réserver maintenant ouvre une demande de devis officiel. Nous vérifions les renseignements et confirmons pièces, tâches, produits, prix, taxes, accès et calendrier. Le formulaire ne vaut ni acceptation d’un devis, ni réservation de créneau, ni paiement. Le rendez-vous est confirmé après acceptation du devis officiel et accord sur la date.",
        ),
      ],
    },
    {
      id: "billing",
      title: t("Time, minimums and optional extras", "Durée, minimums et suppléments"),
      body: [
        t(
          "For recurring cleaning, each selected extra is set to First visit only by default. Choose Every visit explicitly if it should repeat, including on the first visit. The estimate separates the initial visit from following visits. Average monthly budgets include recurring extras only, excluding initial-only extras and the initial rate difference. For a one-time service, all selected extras apply to that single visit.",
          "Pour un entretien récurrent, chaque supplément choisi est proposé par défaut pour la première visite seulement. Sélectionnez explicitement À chaque visite pour le répéter, première visite comprise. L’estimation distingue la visite initiale des suivantes. Le budget mensuel moyen inclut uniquement les suppléments récurrents, hors options initiales et écart du tarif de première visite. Pour une prestation ponctuelle, toutes les options concernent cette visite unique.",
        ),
        t(
          "The fridge-and-oven saving applies only to visits where both services are selected. If only one repeats, its individual price applies to following visits. The official quote confirms the scope and frequency of each extra before work.",
          "La remise réfrigérateur et four s’applique uniquement aux visites où les deux prestations sont choisies. Si une seule se répète, son prix individuel s’applique aux visites suivantes. Le devis officiel confirme le périmètre et la fréquence de chaque option avant le travail.",
        ),
        t(
          "A worker-hour is one person working for one hour. Two cleaners for two hours represent four worker-hours. Residential standard visits have a three-worker-hour minimum; recurring commercial visits have a two-worker-hour minimum. One-time commercial standard cleaning has a three-worker-hour minimum. Deep cleaning has a 4.5-worker-hour minimum.",
          "Une heure-personne correspond à une personne pendant une heure. Deux intervenants pendant deux heures représentent quatre heures-personnes. Le minimum résidentiel standard est de trois heures-personnes ; le commercial récurrent, deux heures-personnes. Le commercial ponctuel standard a un minimum de trois heures-personnes. Le nettoyage en profondeur a un minimum de 4,5 heures-personnes.",
        ),
        t(
          "Choose an agreed fixed quote or hourly cleaning with an approved time budget. Fixed prices stay fixed for the agreed scope. Hourly work is billed in 15-minute increments per person after the minimum. Flat add-on fees apply to fixed-price visits; for hourly service, these tasks count toward approved working time instead. No task is charged twice. We seek approval before any extra work or charge.",
          "Choisissez un forfait convenu ou une prestation horaire avec un budget de temps accepté. Le forfait reste fixe pour le périmètre convenu. À l’heure, le temps est décompté par tranches de 15 minutes par personne après le minimum. Les options forfaitaires s’appliquent aux visites à prix fixe ; à l’heure, elles sont comptées dans le temps accepté. Aucune double facturation. Votre accord est demandé avant tout travail ou frais supplémentaire.",
        ),
        t(
          "Add-on-only visits have a minimum total price of $150 before tax, including selected tasks. Dimensions and quantities beyond the published limits are quoted separately. Access to running water and electricity must be available; please clear work areas and keep pets safely away.",
          "Une visite limitée aux options a un minimum total de 150 $ avant taxes, prestations choisies comprises. Dimensions et quantités hors limites publiées : devis séparé. L’eau et l’électricité doivent être accessibles ; dégagez les zones de travail et gardez les animaux à l’écart.",
        ),
      ],
    },
    {
      id: "savings",
      title: t(
        "Recurring prices and clear savings",
        "Tarifs récurrents et économies transparentes",
      ),
      body: [
        t(
          "Residential recurring rates begin with the second visit. The initial visit is charged at the one-time standard rate, or an agreed deep-clean price if needed. For commercial contracts, any initial restoration clean is assessed and quoted separately.",
          "Les tarifs résidentiels récurrents commencent à la deuxième visite. La première est au tarif standard ponctuel, ou à un prix de nettoyage en profondeur convenu si nécessaire. Pour les contrats commerciaux, une remise en état initiale est évaluée et chiffrée séparément.",
        ),
        t(
          "Savings appear in dollars beside the package price. For the same three-worker-hour standard visit, the weekly residential package is $126 instead of $150, saving $24; the every-two-weeks residential package is $135, saving $15; and the monthly residential package is $144, saving $6. The weekly residential package is also $9 less per visit than the every-two-weeks package. The reference is the current one-time package with the same tasks and duration. These amounts are before tax and extras; residential recurring savings begin at the second visit. The commercial comparison uses three hours at $135 instead of $150, saving $15. A smaller commercial contract can start at $90 for two hours, without claiming a saving against a one-time package below its three-hour minimum.",
          "Les économies sont affichées en dollars à côté du forfait. Pour une même visite standard de trois heures-personnes, le forfait résidentiel hebdomadaire à 126 $ au lieu de 150 $ économise 24 $ ; celui tous les 14 jours à 135 $ économise 15 $ ; et le mensuel à 144 $ économise 6 $. Le forfait hebdomadaire coûte aussi 9 $ de moins par visite que celui tous les 14 jours. La référence est le forfait ponctuel actuel avec les mêmes tâches et la même durée. Montants avant taxes et options ; les économies récurrentes résidentielles commencent à la deuxième visite. La comparaison commerciale porte sur trois heures à 135 $ au lieu de 150 $, soit 15 $ économisés. Un petit contrat commercial peut commencer à 90 $ pour deux heures, sans annoncer d’économie par rapport à un forfait ponctuel inférieur à son minimum de trois heures.",
        ),
        t(
          "The fridge-and-oven bundle is $65, compared with $70 for the two services separately at the same visit. This is a $5 bundle saving. Deep and specialist services are priced for their specific scope. Monthly budgets use 52 weeks, 26 biweekly visits or 12 monthly visits per year; the actual commercial calendar and billing terms are agreed in writing.",
          "Le forfait réfrigérateur et four est à 65 $, contre 70 $ pour les deux prestations séparées lors d’une même visite : une économie de 5 $. Les prestations approfondies ou spécialisées sont chiffrées selon leur périmètre particulier. Les budgets mensuels utilisent 52 semaines, 26 visites aux deux semaines ou 12 visites mensuelles par an ; calendrier commercial et facturation sont convenus par écrit.",
        ),
      ],
    },
    {
      id: "frequency",
      title: t("Choose your cleaning frequency", "Choisir votre fréquence de nettoyage"),
      body: [
        t(
          "Once a week means one visit every seven days (52 per year). Once every two weeks means one visit every 14 days (26 per year). Weekly residential cleaning is $42 per worker-hour, compared with $45 for service every two weeks. The weekly rate is lower for the same work and duration. The average monthly budget reflects both the rate and number of visits. A monthly plan has 12 visits per year.",
          "Une visite par semaine correspond à un passage tous les sept jours (52 par an). Une visite toutes les deux semaines correspond à un passage tous les 14 jours (26 par an). Le tarif résidentiel hebdomadaire est de 42 $ par heure-personne, contre 45 $ pour une visite tous les 14 jours. À travail et durée identiques, la visite hebdomadaire coûte moins cher. Le budget mensuel moyen tient compte du tarif et du nombre de passages. Le forfait mensuel compte 12 visites par an.",
        ),
        FREQUENCY_NOTE[language],
        t(
          "For commercial maintenance, the published $45 worker-hour rate is the reference for one visit per week. Two or more visits per week and custom schedules receive a tailored quote. The calculator records your requested schedule and options without assigning a fixed total before that rate review. A schedule change alone does not require an on-site visit; a free visit is still required when the property or the work needs assessment.",
          "En entretien commercial, le tarif publié de 45 $ par heure-personne sert de référence pour une visite par semaine. Deux passages par semaine ou plus et les rythmes personnalisés font l’objet d’un devis adapté. Le calculateur transmet la fréquence et les options demandées sans attribuer de total fixe avant révision du tarif. Un changement de fréquence seul n’impose pas de visite sur site ; la visite gratuite reste nécessaire si les lieux ou les travaux doivent être évalués.",
        ),
      ],
    },
    {
      id: "specialist",
      title: t("Free on-site assessments", "Visites gratuites sur site"),
      body: [
        t(
          "For services outside the standard packages or requiring specialized equipment, a free on-site visit is necessary to provide a precise quote. This includes major construction and renovation cleaning, mould, flooding and water damage, carpet or upholstery extraction, machine floor care, high or exterior windows, production kitchens, clinical areas and custom move-in, move-out or rental-turnover services.",
          "Pour les prestations hors forfait standard ou nécessitant du matériel spécialisé, une visite gratuite sur site est nécessaire afin de fournir un devis précis. Cela comprend les gros travaux de construction et rénovation, moisissures, inondations et dégâts d’eau, extraction des tapis ou tissus, entretien mécanisé des sols, vitres en hauteur ou extérieures, cuisines de production, zones de soins et forfaits sur mesure d’entrée, sortie ou rotation locative.",
        ),
        t(
          "Photos can help prepare the visit but do not replace it for these services. We confirm service availability, the appropriate team and equipment, the scope and price after assessment.",
          "Les photos peuvent préparer la visite mais ne la remplacent pas pour ces services. Disponibilité, équipe et matériel adaptés, périmètre et prix sont confirmés après évaluation.",
        ),
      ],
    },
    {
      id: "quality",
      title: t("Our team and quality follow-up", "Notre équipe et le suivi qualité"),
      body: [
        t(
          "All OMSG employees assigned to cleaning services are trained for their tasks and have undergone criminal background checks.",
          "Tous les employés d’OMSG affectés aux prestations de nettoyage sont formés à leurs tâches et ont fait l’objet d’une vérification des antécédents judiciaires.",
        ),
        t(
          "A follow-up checklist is completed after each intervention. It records the agreed tasks, completed work and any observations or items requiring attention. The completed checklist is sent to the client.",
          "Une checklist de suivi est remplie après chaque intervention. Elle indique les tâches convenues, les travaux réalisés et les observations ou points à suivre. La checklist complétée est transmise au client.",
        ),
        t(
          "With your prior authorization, before-and-after photos are taken to document the work and included in the private report sent to you. If you do not authorize photos, the checklist is still completed and sent. Declining photos does not prevent you from receiving our cleaning service.",
          "Avec votre autorisation préalable, des photos avant et après documentent le travail et accompagnent le rapport privé qui vous est envoyé. Sans autorisation de photos, la checklist est tout de même remplie et transmise. Refuser les photos ne vous empêche pas de bénéficier du nettoyage.",
        ),
      ],
    },
    {
      id: "photos",
      title: t("Photos, consent and your information", "Photos, consentement et renseignements"),
      body: [
        t(
          "Photos submitted with a quote request are recommended but optional. Authorization for photos during the intervention is separate, optional and not preselected. You may change your choice before photos are taken. Quality photos are used for the service record and your report; advertising or public sharing requires separate permission.",
          "Les photos jointes à une demande de devis sont recommandées mais facultatives. L’autorisation des prises de vue pendant l’intervention est distincte, facultative et non présélectionnée. Vous pouvez changer votre choix avant les photos. Les photos qualité servent au dossier de prestation et à votre rapport ; publicité ou partage public nécessitent un accord distinct.",
        ),
        t(
          "We use your contact details, service address, selections and consent choices to prepare the quote and manage your service in our customer system. Our privacy policy explains how to request access, correction or deletion of your information.",
          "Nous utilisons vos coordonnées, adresse de service, choix et consentements pour préparer le devis et gérer la prestation dans notre système client. Notre politique de confidentialité explique comment demander l’accès, la correction ou la suppression de vos renseignements.",
        ),
      ],
    },
    {
      id: "tax",
      title: t("Taxes, payment and changes", "Taxes, paiement et modifications"),
      body: [
        t(
          "Published rates are in Canadian dollars before tax. The calculator shows Ontario HST at 13%, or Quebec GST at 5% and QST at 9.975%, according to the selected service province. Applicable taxes and the final total are confirmed in the official quote. Payment, rescheduling and cancellation terms are provided before booking.",
          "Les tarifs publiés sont en dollars canadiens avant taxes. Le calculateur affiche la TVH ontarienne de 13 %, ou la TPS de 5 % et la TVQ de 9,975 % au Québec, selon la province de l’intervention. Les taxes applicables et le total final sont confirmés au devis officiel. Paiement, report et annulation sont précisés avant réservation.",
        ),
      ],
    },
  ];
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main data-i18n-ignore="true" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/pricing"
          className="text-sm font-semibold text-teal-800 underline underline-offset-4"
        >
          ← {t("Cleaning prices", "Tarifs de nettoyage")}
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
          {t("Pricing and quality policy", "Politique des prix et de la qualité")}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          {t(
            "Know what is included, how your quote is confirmed and how we follow up after your service.",
            "Découvrez ce qui est inclus, comment votre devis est confirmé et comment nous assurons le suivi de votre prestation.",
          )}
        </p>
        <p className="mt-4 text-sm font-medium text-teal-800">{SERVICE_AREA[language]}</p>
        <div className="mt-8 grid gap-4 rounded-lg bg-teal-50 p-6 text-sm font-medium text-teal-950 sm:grid-cols-3">
          {[
            t("Prices confirmed before work", "Prix confirmés avant le travail"),
            t("No duplicate task charges", "Aucune tâche facturée deux fois"),
            t("Photos only with your permission", "Photos uniquement avec votre accord"),
          ].map((item) => (
            <p key={item} className="flex gap-2">
              <Check aria-hidden className="h-5 w-5 shrink-0 text-teal-700" />
              {item}
            </p>
          ))}
        </div>
        <p className="mt-8 text-sm text-slate-600">
          {t(
            "Open a topic to read the details.",
            "Ouvrez une rubrique pour consulter les détails.",
          )}
        </p>
        <div className="mt-4 border-t border-slate-200">
          {sections.map((section, index) => (
            <details
              key={section.id}
              id={section.id}
              open={index === 0}
              className="group scroll-mt-28 border-b border-slate-200 py-2"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-lg font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {section.title}
                <ChevronDown
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-teal-700 transition group-open:rotate-180"
                />
              </summary>
              <div className="pb-5">
                {section.body.map((body, i) => (
                  <p key={i} className="mt-3 text-sm leading-7 text-slate-600">
                    {body}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm">
          <Link to="/privacy" className="font-semibold text-teal-800 underline">
            {t("Privacy policy", "Politique de confidentialité")}
          </Link>
          <Link to="/pricing" className="font-semibold text-teal-800 underline">
            {t("Build my estimate", "Calculer mon estimation")}
          </Link>
          <a href="tel:+16134076699" className="font-semibold text-teal-800">
            (613) 407-6699
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          {t("Policy version", "Version de la politique")} {PRICING_VERSION}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
