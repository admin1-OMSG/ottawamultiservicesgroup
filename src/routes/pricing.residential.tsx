import { createFileRoute } from "@tanstack/react-router";
import { CleaningPricingPage } from "@/components/cleaning-pricing-page";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/pricing/residential")({
  head: () =>
    seoHead({
      title: "Residential Cleaning Prices | Ottawa & Gatineau | OMSG",
      description:
        "Residential cleaning in Ottawa and Gatineau. Once a week or every 14 days, package savings and optional extras. Multiple weekly visits receive a revised quote.",
      path: "/pricing/residential",
    }),
  component: () => <CleaningPricingPage audience="residential" />,
});
