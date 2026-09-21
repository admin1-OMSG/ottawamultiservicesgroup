import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/lib/language";

/** A short, purpose-specific notice at the point of collection. */
export function CollectionNotice({ purpose }: { purpose: "quote" | "partner" | "career" }) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const messages = {
    quote: fr
      ? "Nous utilisons vos renseignements pour étudier votre demande, préparer votre devis et vous répondre. Les photos sont facultatives et servent à comprendre le travail demandé. Cette demande ne vous engage pas et ne vous inscrit pas à des envois promotionnels."
      : "We use your information to review your request, prepare your quote and reply to you. Photos are optional and help us understand the work requested. This request does not commit you to a service or subscribe you to promotional messages.",
    partner: fr
      ? "Nous utilisons votre profil et les documents fournis pour évaluer votre proposition et vous contacter au sujet d’occasions de collaboration. Votre envoi ne crée pas de contrat et ne vous inscrit pas à des envois promotionnels."
      : "We use your profile and supporting documents to assess your proposal and contact you about collaboration opportunities. Submitting does not create a contract or subscribe you to promotional messages.",
    career: fr
      ? "Nous utilisons votre candidature et votre CV pour évaluer votre profil et vous contacter au sujet du recrutement. Les champs facultatifs peuvent rester vides. Votre candidature ne vous inscrit pas à des envois promotionnels."
      : "We use your application and resume to assess your profile and contact you about recruitment. Optional fields may be left blank. Applying does not subscribe you to promotional messages.",
  };

  return (
    <p data-i18n-ignore="true" className="max-w-3xl text-sm leading-relaxed text-slate-600">
      {messages[purpose]}{" "}
      <Link to="/privacy" className="font-medium text-teal-800 underline underline-offset-4">
        {fr ? "Politique de confidentialité" : "Privacy Policy"}
      </Link>
    </p>
  );
}
