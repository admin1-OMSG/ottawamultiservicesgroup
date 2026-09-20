import { createFileRoute } from "@tanstack/react-router";
import { PricingLanding } from "@/components/cleaning-pricing-overview";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/pricing/")({
  head: () =>
    seoHead({
      title: "Cleaning Prices Ottawa & Gatineau | OMSG",
      description:
        "Residential and commercial cleaning in Ottawa and Gatineau. Package savings, included products and custom weekly frequencies. Build your estimate or request a tailored quote.",
      path: "/pricing",
    }),
  component: PricingLanding,
});
