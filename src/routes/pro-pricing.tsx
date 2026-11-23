import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { CreditOffer } from "@/features/marketplace/credit-offer";
import { ProfessionalPricing } from "@/features/marketplace/pro/ProfessionalPricing";

export const Route = createFileRoute("/pro-pricing")({
  head: () => ({
    meta: [
      { title: "Professional pricing | Ottawa Multiservices Group" },
      {
        name: "description",
        content:
          "Compare credit packs and monthly subscriptions for professionals contacting clients on OMSG.",
      },
    ],
  }),
  loader: async ({ abortController }): Promise<CreditOffer[] | null> => {
    if (!import.meta.env.SSR) return null;
    try {
      // The server reads list prices anonymously, even for signed-in visitors.
      const publicClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          accessToken: async () => null,
        },
      );
      const signal = AbortSignal.any([abortController.signal, AbortSignal.timeout(2500)]);
      const { data, error } = await publicClient
        .rpc("market_public_credit_offers")
        .abortSignal(signal);
      return !error && Array.isArray(data) ? (data as CreditOffer[]) : null;
    } catch {
      // Render the page even if Supabase is unavailable. The browser will retry.
      return null;
    }
  },
  component: ProfessionalPricingPage,
});

function ProfessionalPricingPage() {
  const initialOffers = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <ProfessionalPricing initialOffers={initialOffers ?? undefined} />
      <SiteFooter />
    </div>
  );
}
