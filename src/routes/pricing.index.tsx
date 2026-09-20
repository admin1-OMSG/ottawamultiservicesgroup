import { createFileRoute } from "@tanstack/react-router";
import { PricingLanding } from "@/components/cleaning-pricing-page";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/pricing/")({
  head: () =>
    seoHead({
      title: "Cleaning Prices Ottawa | Residential & Commercial | OMSG",
      description:
        "Clear residential and commercial cleaning prices, products included. Build a provisional estimate and request your official quote.",
      path: "/pricing",
    }),
  component: PricingLanding,
});
