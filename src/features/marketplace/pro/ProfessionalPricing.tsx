import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { loyaltyTerms, type CreditOffer } from "../credit-offer";
import { credits, type Translate } from "./model";

type AvailableOffer = CreditOffer & { price_cents: number; credits: number };

async function loadPublicOffers(): Promise<CreditOffer[]> {
  const { data, error } = await supabase.rpc("market_public_credit_offers");
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Invalid credit offers");
  return data as CreditOffer[];
}

function availableOffers(offers: CreditOffer[]): AvailableOffer[] {
  return offers.filter(
    (offer): offer is AvailableOffer =>
      offer.enabled && offer.price_cents !== null && offer.credits !== null,
  );
}

export function ProfessionalPricing({ initialOffers }: { initialOffers?: CreditOffer[] }) {
  const { language } = useLanguage();
  const t: Translate = (en, fr) => (language === "fr" ? fr : en);
  const catalog = useQuery({
    queryKey: ["market-public-credit-offers"],
    queryFn: loadPublicOffers,
    initialData: initialOffers,
    staleTime: 30_000,
    select: availableOffers,
    retry: 1,
  });
  const currency = new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <main data-i18n-ignore="true">
      <header className="border-b border-teal-900 bg-teal-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-14">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t("Professional pricing", "Tarifs professionnels")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-teal-50 sm:text-lg">
            {t(
              "Use credits to contact clients about their requests. Posting a service request is free for clients.",
              "Utilisez vos crédits pour contacter les clients qui ont publié une demande. Publier une demande de service est gratuit pour les clients.",
            )}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:space-y-10 sm:px-8 sm:py-10">
        {catalog.isPending ? (
          <p role="status">{t("Loading prices…", "Chargement des tarifs…")}</p>
        ) : catalog.isError ? (
          <div role="alert" className="space-y-3 rounded-xl border bg-white p-5">
            <p>{t("Prices could not be loaded.", "Les tarifs n’ont pas pu être chargés.")}</p>
            <Button variant="outline" onClick={() => void catalog.refetch()}>
              {t("Try again", "Réessayer")}
            </Button>
          </div>
        ) : catalog.data.length === 0 ? (
          <p role="status">
            {t(
              "There are currently no credit offers available.",
              "Aucune offre de crédits n’est disponible pour le moment.",
            )}
          </p>
        ) : (
          <>
            {(["pack", "subscription"] as const).map((kind) => {
              const offers = catalog.data.filter((offer) => offer.kind === kind);
              if (offers.length === 0) return null;
              const monthly = kind === "subscription";
              return (
                <section key={kind} aria-labelledby={`pricing-${kind}`}>
                  <h2
                    id={`pricing-${kind}`}
                    className="mb-4 font-display text-2xl font-bold tracking-tight text-teal-950"
                  >
                    {monthly
                      ? t("Monthly subscriptions", "Abonnements mensuels")
                      : t("One-time credit packs", "Packs de crédits ponctuels")}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {offers.map((offer) => {
                      const terms = loyaltyTerms(offer, t);
                      const price = currency.format(offer.price_cents / 100);
                      const action = monthly
                        ? t("Start subscription", "Souscrire à l’abonnement")
                        : t("Buy this pack", "Acheter ce pack");
                      return (
                        <article
                          key={offer.code}
                          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                        >
                          <h3 className="text-2xl font-bold text-teal-950">
                            {price}
                            {monthly && (
                              <span className="text-base font-medium">
                                {t(" / month", " / mois")}
                              </span>
                            )}
                          </h3>
                          <p className="mt-2 text-base font-semibold">
                            {terms?.base ?? credits(offer.credits, t)}
                          </p>
                          {terms && (
                            <p className="mt-3 text-sm leading-relaxed text-slate-700">
                              {terms.bonus}
                            </p>
                          )}
                          <div className="mt-auto pt-5">
                            <Button
                              asChild
                              className="min-h-11 w-full justify-between rounded-lg px-4"
                            >
                              <a
                                href={`/pro-market?offer=${encodeURIComponent(offer.code)}`}
                                aria-label={`${action} (${price})`}
                              >
                                {action}
                                <ArrowRight aria-hidden="true" />
                              </a>
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              {t(
                "Sign in with an approved professional account to pay. Any partner discount will appear before checkout.",
                "Pour payer, connectez-vous avec un compte professionnel approuvé. Votre réduction partenaire, si vous en avez une, s’affichera avant le paiement.",
              )}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
