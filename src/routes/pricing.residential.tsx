import { createFileRoute } from "@tanstack/react-router";
import { CleaningPricingPage } from "@/components/cleaning-pricing-page";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/pricing/residential")({
  head: () =>
    seoHead({
      title: "Residential Cleaning Prices and Estimate | OMSG Ottawa",
      description:
        "Weekly and biweekly cleaning at $45 per worker-hour, products included. Choose your home profile and optional extras for a provisional estimate.",
      path: "/pricing/residential",
    }),
  component: () => <CleaningPricingPage audience="residential" />,
});
