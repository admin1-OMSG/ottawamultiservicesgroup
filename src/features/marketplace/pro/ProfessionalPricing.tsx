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
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const starter = catalog.data?.find((offer) => offer.code === "pack52");
  const formatPrice = (cents: number) => currency.format(cents / 100);

  return (
    <main data-i18n-ignore="true">
      <header className="border-b border-teal-900 bg-teal-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-14">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t("Professional pricing", "Tarifs professionnels")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-teal-50 sm:text-lg">
            {t(
              "See how many clients you could reach with each offer. Each request shows its credit cost before you contact the client. Clients can post for free.",
              "Découvrez combien de clients vous pouvez contacter avec chaque offre. Le coût en crédits est affiché sur chaque demande avant la prise de contact. Les clients publient gratuitement.",
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
                    {offers.map((offer) => (
                      <PricingCard
                        key={offer.code}
                        offer={offer}
                        starter={starter}
                        formatPrice={formatPrice}
                        wide={monthly && offers.length === 1}
                        t={t}
                      />
                    ))}
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

function PricingCard({
  offer,
  starter,
  formatPrice,
  wide,
  t,
}: {
  offer: AvailableOffer;
  starter?: AvailableOffer;
  formatPrice: (cents: number) => string;
  wide: boolean;
  t: Translate;
}) {
  const monthly = offer.kind === "subscription";
  const action = monthly
    ? t("Start subscription", "Souscrire à l’abonnement")
    : t("Buy this pack", "Acheter ce pack");
  const price = formatPrice(offer.price_cents);
  const terms = loyaltyTerms(offer, t);
  const bonus = terms ? (offer.loyalty_bonus_credits ?? 0) : 0;
  const totalCredits = offer.credits + bonus;
  const cost = offer.example_contact_credits;
  const contacts = cost && cost > 0 ? Math.floor(offer.credits / cost) : 0;
  const bonusContacts = cost && cost > 0 ? Math.floor(totalCredits / cost) : 0;
  const additionalContacts = bonusContacts - contacts;

  // Use whole starter packs at the same spend or with the same number of credits.
  const packsAtSamePrice =
    starter && starter.price_cents > 0 ? offer.price_cents / starter.price_cents : 0;
  const extraCredits =
    starter && Number.isInteger(packsAtSamePrice) && packsAtSamePrice > 0
      ? offer.credits - packsAtSamePrice * starter.credits
      : 0;
  const packsForSameCredits = starter && starter.credits > 0 ? totalCredits / starter.credits : 0;
  const savings =
    starter && Number.isInteger(packsForSameCredits) && packsForSameCredits > 0
      ? packsForSameCredits * starter.price_cents - offer.price_cents
      : 0;
  const starterPrice = starter ? formatPrice(starter.price_cents) : "";
  const packLabel = (n: number) =>
    n === 1
      ? t(`one ${starterPrice} pack`, `un pack de ${starterPrice}`)
      : t(`${n} packs at ${starterPrice} each`, `${n} packs de ${starterPrice}`);

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${wide ? "flex flex-col md:col-span-2 md:grid md:grid-cols-2 md:gap-x-8 lg:col-span-3" : "flex flex-col"}`}
    >
      <div>
        <h3 className="text-2xl font-bold text-teal-950">
          {price}
          {monthly && <span className="text-base font-medium">{t(" / month", " / mois")}</span>}
        </h3>
        {contacts > 0 && (
          <p className="mt-4 text-lg font-semibold leading-snug text-teal-900">
            {t(
              `Reach up to ${contacts} ${contacts === 1 ? "client" : "clients"}`,
              `Contactez jusqu’à ${contacts} ${contacts === 1 ? "client" : "clients"}`,
            )}
            {monthly && t(" per month", " par mois")}
          </p>
        )}
        <p className="mt-2 text-sm text-slate-600">
          {credits(offer.credits, t)}
          {cost != null &&
            cost > 0 &&
            t(
              ` · example at ${credits(cost, t)} per contact`,
              ` · exemple à ${credits(cost, t)} par contact`,
            )}
        </p>
        {extraCredits > 0 && (
          <p className="mt-3 text-sm leading-relaxed">
            {t(
              `${extraCredits} more ${extraCredits === 1 ? "credit" : "credits"} than ${packLabel(packsAtSamePrice)}.`,
              `${credits(extraCredits, t)} de plus qu’avec ${packLabel(packsAtSamePrice)}.`,
            )}
          </p>
        )}
      </div>
      {terms && (
        <div
          className={`mt-4 rounded-xl bg-teal-50 p-4 text-sm leading-relaxed text-teal-950 ${wide ? "md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0" : ""}`}
        >
          {additionalContacts > 0 && (
            <p className="mb-1 font-bold">
              {t(
                `Up to ${bonusContacts} ${bonusContacts === 1 ? "contact" : "contacts"} — ${additionalContacts} more for the same price`,
                `Jusqu’à ${bonusContacts} ${bonusContacts === 1 ? "contact" : "contacts"}, soit ${additionalContacts} de plus au même prix`,
              )}
            </p>
          )}
          <p>{terms.bonus}</p>
          {savings > 0 && (
            <p className="mt-2 font-medium">
              {t(
                `Save ${formatPrice(savings)} on ${credits(totalCredits, t)} compared with ${packLabel(packsForSameCredits)}.`,
                `Économisez ${formatPrice(savings)} sur ${credits(totalCredits, t)} par rapport à ${packLabel(packsForSameCredits)}.`,
              )}
            </p>
          )}
        </div>
      )}
      <div className="mt-auto pt-5">
        <Button asChild className="min-h-11 w-full justify-between rounded-lg px-4">
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
}
