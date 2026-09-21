import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion Instructions | Ottawa Multiservices Group Inc." },
      { name: "description", content: "How to request deletion of personal information held by OMSG, including client records and connected Facebook or Instagram conversations." },
    ],
    links: [{ rel: "canonical", href: "/data-deletion" }],
  }),
  component: DataDeletionPage,
});

function DataDeletionPage() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => language === "fr" ? fr : en;
  const link = "font-medium text-navy underline underline-offset-4 decoration-primary/50 hover:decoration-primary";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main data-i18n-ignore="true">
        <PageHero eyebrow={t("Your information", "Vos renseignements")} title={t("Request data deletion", "Demander la suppression de vos données")} subtitle={t("One contact for website, service and connected social media records.", "Un même contact pour les données du site, des services et des réseaux sociaux connectés.")} />
        <article className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
          <p className="text-sm text-muted-foreground">{t("Last updated: September 21, 2026", "Dernière mise à jour : 21 septembre 2026")}</p>
          <p className="mt-5 text-base leading-7 text-foreground/80">{t("You can ask Ottawa Multiservices Group Inc. to delete personal information associated with your website requests, client account, service history, application or conversations received through Facebook, Messenger or Instagram. You do not need to sign in to make a request.", "Vous pouvez demander à Ottawa Multiservices Group Inc. de supprimer les renseignements liés à vos demandes sur le site, votre compte client, votre historique de service, votre candidature ou vos échanges reçus via Facebook, Messenger ou Instagram. Aucune connexion n’est nécessaire pour faire la demande.")}</p>
          <section className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-7">
            <h2 className="text-xl font-bold text-navy">{t("1. Send your request", "1. Envoyez votre demande")}</h2>
            <p className="mt-3 break-words leading-7 text-foreground/80">{t("Email OMSG management, attention Privacy, at ", "Écrivez à la direction d’OMSG, à l’attention du responsable de la confidentialité, à ")}<a href="mailto:info@ottawamultiservicesgroup.com?subject=Data%20Deletion%20Request" className={link}>info@ottawamultiservicesgroup.com</a>.</p>
            <p className="mt-3 leading-7 text-foreground/80">{t("Use the subject “Data Deletion Request”. Include your name, the email or phone number you used with us, and which records you want deleted. For social media messages, identify the platform and your account or the relevant conversation.", "Indiquez « Demande de suppression de données » comme objet. Précisez votre nom, l’adresse courriel ou le téléphone utilisé avec nous, ainsi que les données à supprimer. Pour les messages sur les réseaux sociaux, identifiez la plateforme et votre compte ou la conversation concernée.")}</p>
            <p className="mt-3 text-sm leading-6 text-foreground/75">{t("Do not send passwords, full card numbers or identity documents unless we explain why a specific verification is necessary and how to provide it safely.", "N’envoyez pas de mots de passe, de numéros complets de carte ni de pièces d’identité, sauf si nous vous expliquons pourquoi une vérification précise est nécessaire et comment la transmettre de façon sécurisée.")}</p>
          </section>
          <section className="mt-8">
            <h2 className="text-xl font-bold text-navy">{t("2. We locate and review your records", "2. Nous recherchons et examinons votre dossier")}</h2>
            <p className="mt-3 leading-7 text-foreground/80">{t("We may ask for limited information to verify your identity or clarify the request. We will respond within applicable legal time limits and explain any additional steps. A deletion request does not itself cancel a booked service or end an accepted contract; please tell us separately if you also wish to cancel or reschedule.", "Nous pouvons demander des renseignements limités pour vérifier votre identité ou préciser la demande. Nous répondrons dans les délais légaux applicables et expliquerons les éventuelles étapes supplémentaires. Une demande de suppression ne suffit pas à annuler un service réservé ou à mettre fin à un contrat accepté ; indiquez séparément si vous souhaitez aussi annuler ou reporter l’intervention.")}</p>
          </section>
          <section className="mt-8">
            <h2 className="text-xl font-bold text-navy">{t("3. Deletion and necessary retention", "3. Suppression et conservation nécessaire")}</h2>
            <p className="mt-3 leading-7 text-foreground/80">{t("Information no longer needed is deleted or anonymized, subject to applicable law. Certain invoices, payment records, signed agreements or information relevant to a dispute may need to be retained for accounting, tax, contractual or legal obligations. We will explain any restriction and the basis for continued retention. Restricted backups may remain until their normal replacement cycle.", "Les renseignements devenus inutiles sont supprimés ou anonymisés, sous réserve de la loi applicable. Certaines factures, preuves de paiement, conventions signées ou données pertinentes à un litige peuvent devoir être conservées pour des obligations comptables, fiscales, contractuelles ou légales. Nous expliquerons toute restriction et le motif de conservation. Des sauvegardes à accès limité peuvent subsister jusqu’à leur remplacement normal.")}</p>
            <p className="mt-3 leading-7 text-foreground/80">{t("Deleting records held by OMSG does not automatically delete information independently held by Meta, your email provider or another platform. You may need to use that provider’s privacy controls. If your request involves one of our service providers, we will explain the steps relevant to information processed for us.", "La suppression des données détenues par OMSG ne supprime pas automatiquement les renseignements conservés indépendamment par Meta, votre fournisseur de courriel ou une autre plateforme. Il peut être nécessaire d’utiliser les outils de confidentialité de ce fournisseur. Si votre demande concerne un de nos prestataires, nous expliquerons les démarches pertinentes pour les renseignements traités pour notre compte.")}</p>
          </section>
          <div className="mt-8 border-t border-border pt-6 text-sm leading-6 text-foreground/80">
            <p>Ottawa Multiservices Group Inc. · Ottawa, Ontario, Canada</p>
            <p className="mt-2"><a href="tel:+16134076699" className={link}>(613) 407-6699</a></p>
            <p className="mt-4"><Link to="/privacy" className={link}>{t("Read our full Privacy Policy", "Lire notre politique de confidentialité complète")}</Link></p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
