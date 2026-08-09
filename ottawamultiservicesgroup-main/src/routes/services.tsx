import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Truck, Snowflake, Leaf, Car, Wrench, Building2, Home, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our Services | Ottawa Multi Services Group" },
      { name: "description", content: "Explore residential and commercial services across Ottawa-Gatineau: cleaning, moving, landscaping, snow removal, mobile detailing, tire change and more." },
      { property: "og:title", content: "Our Services — Ottawa MSG" },
      { property: "og:description", content: "Residential and commercial services across Ottawa-Gatineau." },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const CATEGORIES = [
  {
    kind: "Residential",
    items: [
      { icon: Sparkles, title: "House Cleaning", body: "Regular, deep, move-in/out, Airbnb turnover and post-construction cleans." },
      { icon: Car, title: "Mobile Vehicle Detailing", body: "Exterior, interior and full-detail packages at your driveway." },
      { icon: Leaf, title: "Lawn & Landscaping", body: "Mowing, trimming, spring and fall cleanups, garden maintenance." },
      { icon: Snowflake, title: "Snow Removal", body: "Per-visit or seasonal contracts for driveways and walkways." },
      { icon: Truck, title: "Moving Services", body: "Local residential moves, packing service and loading crews." },
      { icon: Wrench, title: "Mobile Tire Change", body: "Seasonal swaps, flat repairs and battery boosts on-site." },
      { icon: Home, title: "Handyman & Maintenance", body: "Small repairs, mounting, assembly and touch-ups." },
    ],
  },
  {
    kind: "Commercial",
    items: [
      { icon: Building2, title: "Office Cleaning", body: "Scheduled cleans for offices of every size." },
      { icon: Snowflake, title: "Commercial Snow Removal", body: "Parking lots, walkways, salting and 24/7 response." },
      { icon: Leaf, title: "Commercial Lawn Care", body: "Contracts for retail, industrial and condo properties." },
      { icon: Wrench, title: "Property Maintenance", body: "General upkeep, repairs and on-call service." },
      { icon: Sparkles, title: "Janitorial Services", body: "Full-service janitorial for offices, retail and medical." },
    ],
  },
] as const;

function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero eyebrow="Our Services" title="One team for every job around your home or business." subtitle="From weekly cleaning to seasonal snow contracts, we've got the crews, gear and coverage across Ottawa-Gatineau." />

      {CATEGORIES.map((cat) => (
        <section key={cat.kind} className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="text-3xl font-bold text-navy">{cat.kind} Services</h2>
              <Link to="/quote"><Button className="bg-accent text-accent-foreground hover:brightness-105">Get a Free Quote <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((s) => (
                <Card key={s.title} className="p-6 border-border/60 hover:shadow-soft transition-shadow">
                  <div className="h-11 w-11 rounded-lg bg-navy text-navy-foreground grid place-items-center"><s.icon className="h-5 w-5" /></div>
                  <h3 className="mt-4 text-lg font-semibold text-navy">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ))}

      <SiteFooter />
    </div>
  );
}
