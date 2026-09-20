import { createFileRoute } from "@tanstack/react-router";
import { CleaningEstimatePage } from "@/components/cleaning-pricing-page";
import { initialSelection, plansFor, type Audience, type PlanId } from "@/lib/cleaning-pricing";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/pricing/estimate")({
  validateSearch: (search: Record<string, unknown>): { audience: Audience; plan: PlanId } => {
    const audience: Audience = search.audience === "commercial" ? "commercial" : "residential";
    const plan =
      plansFor(audience).find((item) => item.id === search.plan)?.id ??
      initialSelection(audience).plan;
    return { audience, plan };
  },
  head: () =>
    seoHead({
      title: "Your Cleaning Estimate | Ottawa & Gatineau | OMSG",
      description:
        "Choose your cleaning service and optional extras, then request your official quote.",
      path: "/pricing/estimate",
      noindex: true,
    }),
  component: EstimateRoute,
});

function EstimateRoute() {
  const { audience, plan } = Route.useSearch();
  return (
    <CleaningEstimatePage key={`${audience}:${plan}`} audience={audience} initialPlan={plan} />
  );
}
