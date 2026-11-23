export interface CreditOffer {
  code: string;
  kind: "pack" | "subscription";
  price_cents: number | null;
  credits: number | null;
  enabled: boolean;
  name: string;
  loyalty_bonus_credits?: number;
  example_contact_credits?: number | null;
}

export function loyaltyTerms(offer: CreditOffer, t: (en: string, fr: string) => string) {
  const bonus = offer.loyalty_bonus_credits;
  if (!bonus || offer.credits == null) return null;
  const total = offer.credits + bonus;

  if (offer.code === "pack208") {
    return {
      base: t(`${offer.credits} credits on each of your first two purchases of this pack.`,
        `${offer.credits} crédits à chacun des deux premiers achats de ce pack.`),
      bonus: t(`${total} credits (including a ${bonus}-credit bonus) on your third purchase of this pack and every purchase after. Purchases in the same month count.`,
        `${total} crédits (dont ${bonus} en prime) dès le 3e achat de ce pack et à chaque achat suivant, même au cours du même mois.`),
    };
  }
  if (offer.code === "monthly208") {
    return {
      base: t(`${offer.credits} credits for each of the first two paid months of this subscription.`,
        `${offer.credits} crédits pour chacun des deux premiers mois payés de cet abonnement.`),
      bonus: t(`${total} credits (including a ${bonus}-credit bonus) from the third consecutive paid month onward. The count restarts after a break.`,
        `${total} crédits (dont ${bonus} en prime) dès le 3e mois payé consécutif, puis chaque mois. Le compteur repart à zéro après une interruption.`),
    };
  }
  return null;
}
