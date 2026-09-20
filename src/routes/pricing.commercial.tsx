import { createFileRoute } from "@tanstack/react-router";
import { CleaningPricingPage } from "@/components/cleaning-pricing-page";
import { seoHead } from "@/lib/seo";
export const Route = createFileRoute("/pricing/commercial")({
  head: () =>
    seoHead({
      title: "Commercial Cleaning Prices | Ottawa & Gatineau | OMSG",
      description:
        "Office cleaning in Ottawa and Gatineau. See package savings and included tasks. Other weekly frequencies are available with a tailored rate and quote.",
      path: "/pricing/commercial",
    }),
  component: () => <CleaningPricingPage audience="commercial" />,
});
