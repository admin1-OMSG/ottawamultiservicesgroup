import { createFileRoute } from "@tanstack/react-router";
import { CleaningPricingPage } from "@/components/cleaning-pricing-page";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/pricing/commercial")({
  head: () =>
    seoHead({
      title: "Commercial Cleaning Prices and Estimate | OMSG Ottawa",
      description:
        "Scheduled office and commercial cleaning from $45 per worker-hour. See included tasks, estimate a recurring budget and request an official quote.",
      path: "/pricing/commercial",
    }),
  component: () => <CleaningPricingPage audience="commercial" />,
});
