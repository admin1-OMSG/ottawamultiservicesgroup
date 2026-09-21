import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { useLanguage } from "@/lib/language";
import { openPrivacyPreferences } from "@/lib/marketing-consent";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Ottawa Multiservices Group Inc." },
      { name: "description", content: "How OMSG handles service requests, photos, signatures and advertising choices. Privacy information for Ottawa and Gatineau clients." },
      { property: "og:title", content: "Privacy Policy — Ottawa Multiservices Group" },
      { property: "og:description", content: "Your information, your choices and how to contact us." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => language === "fr" ? fr : en;
  const paragraph = "mt-3 space-y-3 text-base leading-7 text-foreground/80";
  const heading = "text-xl font-bold text-navy sm:text-2xl";
  const link = "font-medium text-navy underline underline-offset-4 decoration-primary/50 hover:decoration-primary";
  const sections = [
    ["information", t("Information we use", "Renseignements utilisés")],
    ["photos", t("Photos and messages", "Photos et messages")],
    ["sharing", t("Service providers", "Prestataires")],
    ["cookies", t("Advertising choices", "Choix publicitaires")],
    ["retention", t("Retention and security", "Conservation et sécurité")],
    ["rights", t("Your rights and contact", "Vos droits et contact")],
  ];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main data-i18n-ignore="true">
        <PageHero eyebrow={t("Your information", "Vos renseignements")} title={t("Privacy Policy", "Politique de confidentialité")} subtitle={t("What we collect, why we use it and the choices available to you.", "Les renseignements recueillis, leur utilisation et les choix qui vous sont offerts.")} />
        <article className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
          <p className="text-sm text-muted-foreground">{t("Last updated: September 21, 2026", "Dernière mise à jour : 21 septembre 2026")}</p>
          <p className={paragraph}>{t("Ottawa Multiservices Group Inc. (OMSG, “we” or “us”), based in Ottawa, Ontario, provides services in Ottawa, Gatineau and surrounding areas. This policy covers our website, client portal, service communications, applications and connected social media conversations.", "Ottawa Multiservices Group Inc. (OMSG ou « nous »), établie à Ottawa, en Ontario, offre des services à Ottawa, à Gatineau et dans les environs. Cette politique concerne notre site, notre portail client, les communications liées aux services, les candidatures et les échanges sur les réseaux sociaux connectés.")}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              [t("For your service", "Pour votre service"), t("We use the details needed to answer you and organize the agreed work.", "Nous utilisons les renseignements nécessaires pour vous répondre et organiser les travaux convenus.")],
              [t("Photos are optional", "Photos facultatives"), t("Quality photos require your permission. Publicity needs separate authorization.", "Les photos de suivi nécessitent votre accord. Une publication publicitaire exige une autorisation distincte.")],
              [t("Advertising is your choice", "Publicité : votre choix"), t("You can refuse optional Meta tracking and still request our services.", "Vous pouvez refuser le suivi Meta facultatif et demander nos services.")],
            ].map(([title, text]) => <div key={title} className="rounded-2xl border border-border bg-secondary/50 p-5"><h2 className="font-semibold text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-foreground/75">{text}</p></div>)}
          </div>
          <nav aria-label={t("On this page", "Sur cette page")} className="my-8 flex flex-wrap gap-x-5 gap-y-3 border-y border-border py-5 text-sm">
            {sections.map(([id, title]) => <a key={id} href={`#${id}`} className={link}>{title}</a>)}
          </nav>
          <div className="space-y-10">
            <section id="information" className="scroll-mt-24">
              <h2 className={heading}>{t("1. Information we collect and why", "1. Renseignements recueillis et leur utilisation")}</h2>
              <ul className={`${paragraph} list-disc pl-5 marker:text-primary`}>
                <li>{t("Requests and services: your name, contact details, service address, selected services and frequency, property details, requested dates, messages and optional photos help us prepare quotes, arrange appointments and complete the work. Please share only what is needed for your request.", "Demandes et services : votre nom, vos coordonnées, l’adresse d’intervention, les services et fréquences choisis, les caractéristiques des lieux, les dates souhaitées, vos messages et vos photos facultatives servent à préparer un devis, organiser les rendez-vous et réaliser les travaux. Transmettez uniquement les renseignements utiles à votre demande.")}</li>
                <li>{t("Client records: account details, quotes, agreed tasks, appointments, checklists, invoices, payment status and correspondence support the portal, service follow-up and accounting. When an online card payment is offered, Stripe processes the card details; our CRM records the payment reference and status rather than your full card number.", "Dossier client : les renseignements de compte, devis, tâches convenues, rendez-vous, listes de contrôle, factures, états de paiement et échanges servent au portail, au suivi et à la comptabilité. Lorsqu’un paiement en ligne par carte est proposé, Stripe traite les données de carte ; notre CRM conserve la référence et l’état du paiement plutôt que le numéro complet de la carte.")}</li>
                <li>{t("Electronic signatures: we record your name, signature image, accepted quote, consent, date and time, account and, when available, IP address and browser information as evidence of acceptance and appointment confirmation.", "Signature électronique : nous enregistrons votre nom, l’image de la signature, le devis accepté, votre consentement, la date et l’heure, le compte ainsi que, lorsqu’ils sont disponibles, l’adresse IP et les renseignements du navigateur, pour conserver une preuve de l’acceptation et de la confirmation du rendez-vous.")}</li>
                <li>{t("Careers and partnerships: the contact details, experience, availability, CVs and business documents you submit are used to review your application and communicate with you. Do not include government identification numbers or unrelated sensitive documents in an initial application.", "Emploi et partenariat : les coordonnées, l’expérience, les disponibilités, les CV et les documents professionnels transmis servent à examiner votre candidature et à communiquer avec vous. N’ajoutez pas de numéros d’identification gouvernementaux ni de documents sensibles sans rapport avec la candidature initiale.")}</li>
                <li>{t("Social media: if you contact us on Facebook, Messenger or Instagram and the relevant integration is enabled, our business inbox may receive your platform identifier, profile name, messages and attachments. Hosting and authentication services also process connection and technical information needed to operate and secure the site. Optional advertising is described below.", "Réseaux sociaux : si vous nous contactez sur Facebook, Messenger ou Instagram et que l’intégration correspondante est activée, notre messagerie professionnelle peut recevoir votre identifiant de plateforme, votre nom de profil, vos messages et vos pièces jointes. L’hébergement et l’authentification traitent aussi les données de connexion nécessaires au fonctionnement et à la sécurité du site. Le suivi publicitaire facultatif est expliqué ci-dessous.")}</li>
              </ul>
            </section>
            <section id="photos" className="scroll-mt-24">
              <h2 className={heading}>{t("2. Photos and service communications", "2. Photos et communications liées au service")}</h2>
              <div className={paragraph}>
                <p>{t("Photos can help us assess your request, but providing them is optional. Before-and-after quality photos are taken with your authorization and used for the private service report. Refusing these photos does not prevent the agreed service. Please avoid including people, identity documents, financial papers or unrelated belongings in photos you send.", "Les photos peuvent faciliter l’évaluation de votre demande, mais elles sont facultatives. Les photos avant et après de contrôle qualité sont prises avec votre autorisation et servent au compte rendu privé de l’intervention. Les refuser n’empêche pas le service convenu. Évitez d’inclure des personnes, des pièces d’identité, des documents financiers ou des effets sans rapport avec le travail dans les photos transmises.")}</p>
                <p>{t("Permission for a private quality report is not permission to publish images on our website, social media or advertisements. We ask for separate authorization before that use. Contact us to withdraw optional permission for future use; this does not automatically erase records we must lawfully retain.", "L’autorisation d’un compte rendu privé ne permet pas de publier les images sur notre site, nos réseaux sociaux ou nos publicités. Une autorisation distincte est demandée pour cette utilisation. Contactez-nous pour retirer une autorisation facultative pour l’avenir ; cela n’efface pas automatiquement les documents dont la conservation reste légalement nécessaire.")}</p>
                <p>{t("We contact you about your request, quotes, appointments, services and payments. A quote request does not automatically subscribe you to promotional messages. Promotional communications require an applicable consent basis and a way to unsubscribe; opting out does not stop necessary messages about an agreed service.", "Nous vous contactons au sujet de votre demande, des devis, rendez-vous, interventions et paiements. Une demande de devis ne vous inscrit pas automatiquement aux messages promotionnels. Ceux-ci nécessitent un consentement applicable et un moyen de se désabonner ; le refus n’empêche pas les messages nécessaires au service convenu.")}</p>
              </div>
            </section>
            <section id="sharing" className="scroll-mt-24">
              <h2 className={heading}>{t("3. Who receives information", "3. Destinataires des renseignements")}</h2>
              <div className={paragraph}>
                <p>{t("Authorized OMSG staff and service partners receive information relevant to their work, such as the address, tasks, timing and access instructions. Our technology providers process information for their respective functions:", "Le personnel autorisé d’OMSG et les partenaires chargés de l’intervention reçoivent les renseignements utiles à leur mission : adresse, tâches, horaire et consignes d’accès. Nos prestataires techniques traitent des renseignements selon leur fonction :")}</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                  <li>{t("Supabase: client and application records, authentication and file storage.", "Supabase : dossiers clients et candidatures, authentification et stockage de fichiers.")}</li>
                  <li>{t("Resend: transactional email delivery and related delivery information.", "Resend : envoi de courriels transactionnels et renseignements de distribution associés.")}</li>
                  <li>{t("Stripe: online payment processing when that option is used.", "Stripe : traitement des paiements en ligne lorsque cette option est utilisée.")}</li>
                  <li>{t("Meta: Facebook/Instagram conversations and optional advertising measurement as described below.", "Meta : échanges Facebook/Instagram et mesure publicitaire facultative décrite ci-dessous.")}</li>
                  <li>{t("Cloudflare and hosting providers: delivery and security of the site. Google Fonts: loading the site’s typefaces, which involves a technical request to Google including connection information such as your IP address.", "Cloudflare et les prestataires d’hébergement : diffusion et sécurité du site. Google Fonts : chargement des polices, qui implique une requête technique à Google incluant des renseignements de connexion comme votre adresse IP.")}</li>
                </ul>
                <p>{t("We may also disclose information where legally required or reasonably necessary to establish or defend legal rights. Providers and their subprocessors may process information outside Quebec or Canada, where local laws can permit access by authorities. We do not guarantee that all data stays in Canada. Contact us for information about the providers and processing arrangements relevant to your records.", "Des renseignements peuvent aussi être communiqués lorsque la loi l’exige ou lorsque cela est raisonnablement nécessaire pour établir ou défendre des droits. Les prestataires et leurs sous-traitants peuvent traiter des données hors du Québec ou du Canada, où les lois locales peuvent permettre l’accès par les autorités. Nous ne garantissons pas que toutes les données restent au Canada. Contactez-nous pour obtenir des renseignements sur les prestataires et les modalités de traitement concernant votre dossier.")}</p>
              </div>
            </section>
            <section id="cookies" className="scroll-mt-24 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-7">
              <h2 className={heading}>{t("4. Cookies, browser storage and Meta advertising", "4. Témoins, stockage du navigateur et publicité Meta")}</h2>
              <div className={paragraph}>
                <p>{t("Authentication and security use necessary technical storage. Your language preference and privacy choice are also saved in this browser. The advertising choice is remembered for up to 180 days, whether accepted or refused. These functions are separate from optional advertising tracking.", "L’authentification et la sécurité utilisent le stockage technique nécessaire. Vos choix de langue et de confidentialité sont aussi enregistrés dans ce navigateur. Le choix publicitaire est mémorisé jusqu’à 180 jours, qu’il soit accepté ou refusé. Ces fonctions sont distinctes du suivi publicitaire facultatif.")}</p>
                <p>{t("The Meta Pixel remains off until you allow advertising tracking. If allowed, it can send Meta information about visits to public pages and quote-request events, along with browser, device, network and advertising identifiers. This helps measure Facebook/Instagram advertising and may be used by Meta for advertising personalization or to associate activity with a Meta account, under Meta’s policies. Our advertising events do not intentionally include your message, service address, signature or uploaded photos. The Pixel is not used on our account, client portal, administration, careers or partner-application pages.", "Le Pixel Meta reste désactivé tant que vous n’autorisez pas le suivi publicitaire. Une fois autorisé, il peut transmettre à Meta des renseignements sur les pages publiques consultées et les événements de demande de devis, ainsi que des renseignements du navigateur, de l’appareil, du réseau et des identifiants publicitaires. Cela aide à mesurer les publicités Facebook/Instagram ; Meta peut aussi utiliser ces données pour personnaliser la publicité ou associer l’activité à un compte Meta selon ses politiques. Nos événements publicitaires n’incluent pas volontairement votre message, l’adresse d’intervention, la signature ou les photos téléversées. Le Pixel n’est pas utilisé sur nos pages de compte, de portail client, d’administration, de carrières ou de candidature partenaire.")}</p>
                <p>{t("You can refuse without losing access to our quotes or services, and change your choice below or from the footer. Withdrawal stops future website tracking and attempts to remove accessible Meta advertising cookies in this browser; it does not erase information already sent to Meta. The choice applies to this browser. A different device, cleared browser storage or an expired choice may require you to choose again.", "Vous pouvez refuser sans perdre l’accès aux devis ou aux services, puis modifier votre choix ci-dessous ou depuis le pied de page. Le retrait arrête le suivi futur du site et tente de supprimer les témoins publicitaires Meta accessibles dans ce navigateur ; il n’efface pas les données déjà transmises à Meta. Le choix s’applique à ce navigateur. Un autre appareil, l’effacement du stockage ou l’expiration du choix peut nécessiter une nouvelle sélection.")}</p>
                <p><a className={link} href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">{t("Read Meta’s Privacy Policy", "Lire la politique de confidentialité de Meta")}</a></p>
              </div>
              <button type="button" onClick={openPrivacyPreferences} className="mt-5 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{t("Manage my privacy choices", "Gérer mes choix de confidentialité")}</button>
            </section>
            <section id="retention" className="scroll-mt-24">
              <h2 className={heading}>{t("5. Retention and safeguards", "5. Conservation et protection")}</h2>
              <div className={paragraph}>
                <p>{t("We retain information for the time needed for its purpose and applicable obligations. Factors include an active request or application, the service relationship, accounting and tax requirements, proof of an accepted contract, and a complaint or dispute. Photos and applications do not necessarily require the same retention as accounting records. Once no longer needed, information is deleted or anonymized unless lawful retention is necessary; restricted backups may remain until their normal replacement cycle.", "Les renseignements sont conservés pendant la durée nécessaire à leur utilisation et aux obligations applicables : traitement d’une demande ou candidature, relation de service, exigences comptables et fiscales, preuve d’un contrat accepté, réclamation ou litige. Les photos et candidatures n’exigent pas nécessairement la même conservation que les documents comptables. Lorsqu’ils ne sont plus nécessaires, les renseignements sont supprimés ou anonymisés, sauf conservation légitime requise ; des sauvegardes à accès limité peuvent subsister jusqu’à leur remplacement normal.")}</p>
                <p>{t("Access restrictions and account-based permissions limit access to records and private files. Service-photo links may be time-limited. No website, email or storage system is entirely risk-free. Protect your account and avoid forwarding private access links. Contact us promptly if you suspect unauthorized access.", "Des restrictions d’accès et des autorisations liées aux comptes limitent l’accès aux dossiers et fichiers privés. Les liens vers les photos d’intervention peuvent être temporaires. Aucun site, courriel ou stockage n’est entièrement exempt de risque. Protégez votre compte et évitez de transférer des liens privés. Contactez-nous rapidement si vous soupçonnez un accès non autorisé.")}</p>
              </div>
            </section>
            <section id="rights" className="scroll-mt-24">
              <h2 className={heading}>{t("6. Your choices, requests and complaints", "6. Vos choix, demandes et réclamations")}</h2>
              <div className={paragraph}>
                <p>{t("You can ask to access or correct your information, request deletion, withdraw optional consent, or raise a privacy concern. Depending on applicable law, you may have other rights, including receiving eligible computerized information in a commonly used format. We may verify your identity using information proportionate to the request. We will explain any lawful limitation or necessary retention and respond within applicable legal time limits.", "Vous pouvez demander l’accès à vos renseignements, leur correction ou leur suppression, retirer un consentement facultatif ou signaler une préoccupation. Selon la loi applicable, d’autres droits peuvent exister, notamment recevoir certains renseignements informatisés admissibles dans un format couramment utilisé. Nous pouvons vérifier votre identité à l’aide de renseignements proportionnés à la demande. Nous expliquerons toute limite légale ou conservation nécessaire et répondrons dans les délais légaux applicables.")}</p>
                <p>{t("We will explain if withdrawing information essential to an agreed service affects our ability to provide it. Optional advertising and publicity-photo consent are not conditions of receiving that service.", "Nous vous informerons si le retrait de renseignements essentiels au service convenu affecte notre capacité à le réaliser. Le consentement au suivi publicitaire et à la publication de photos n’est pas une condition pour recevoir ce service.")}</p>
                <p><Link to="/data-deletion" className={link}>{t("How to request deletion of your data", "Comment demander la suppression de vos données")}</Link></p>
              </div>
              <div className="mt-5 rounded-2xl border border-border bg-white p-5 sm:p-7">
                <p className="font-semibold text-navy">{t("Privacy contact — OMSG management", "Contact confidentialité — direction d’OMSG")}</p>
                <address className="mt-3 space-y-2 break-words text-base not-italic leading-7 text-foreground/80">
                  <p>Ottawa Multiservices Group Inc.<br />Ottawa, Ontario, Canada</p>
                  <p><a href="mailto:info@ottawamultiservicesgroup.com?subject=Privacy%20request" className={link}>info@ottawamultiservicesgroup.com</a></p>
                  <p><a href="tel:+16134076699" className={link}>(613) 407-6699</a></p>
                </address>
                <p className="mt-3 text-sm leading-6 text-foreground/75">{t("Mark your message “Privacy request”. Do not email passwords or full card details. If a concern remains unresolved, you can contact the Office of the Privacy Commissioner of Canada or the Commission d’accès à l’information du Québec, according to their jurisdiction.", "Indiquez « Demande de confidentialité » dans votre message. N’envoyez pas de mot de passe ni de renseignements complets de carte par courriel. Si une préoccupation demeure non résolue, vous pouvez contacter le Commissariat à la protection de la vie privée du Canada ou la Commission d’accès à l’information du Québec, selon leur compétence.")}</p>
              </div>
            </section>
            <section>
              <h2 className={heading}>{t("7. Updates to this policy", "7. Mises à jour de cette politique")}</h2>
              <p className={paragraph}>{t("We update this policy when our services or information practices change. The date above identifies this version. A new policy does not replace consent required for a new, incompatible use of information; where needed, we will explain the change and request your choice.", "Cette politique est mise à jour lorsque nos services ou nos pratiques changent. La date ci-dessus identifie cette version. Une nouvelle politique ne remplace pas le consentement requis pour une utilisation nouvelle et incompatible des renseignements ; lorsque nécessaire, nous expliquerons le changement et solliciterons votre choix.")}</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
