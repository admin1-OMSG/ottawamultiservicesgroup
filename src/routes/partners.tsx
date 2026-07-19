import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Toaster } from "@/components/ui/sonner";
import { QuoteFunnel } from "@/components/quote-funnel";
import { Card } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, Calendar, Wallet } from "lucide-react";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "For Partners | Ottawa Multi Services Group" },
      { name: "description", content: "Grow your business with steady, qualified work from Ottawa Multi Services Group. Apply to join our subcontractor network across Ottawa-Gatineau." },
      { property: "og:title", content: "Partner with Ottawa MSG" },
      { property: "og:description", content: "Grow your business with steady, qualified work across Ottawa-Gatineau." },
      { property: "og:url", content: "/partners" },
    ],
    links: [{ rel: "canonical", href: "/partners" }],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <PageHero eyebrow="For Partners" title="Grow your business with steady, qualified work." subtitle="We match trusted subcontractors with clients across Ottawa-Gatineau. You do great work — we bring the leads, scheduling and payment." />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: TrendingUp, title: "Consistent leads", body: "Fill your calendar with jobs in your service area." },
            { icon: Calendar,   title: "Simple scheduling", body: "Accept the jobs that fit your team and route." },
            { icon: Wallet,     title: "Fast payment",     body: "Get paid on a clear, predictable schedule." },
            { icon: CheckCircle2, title: "Grow your reputation", body: "Build reviews under a trusted Ottawa brand." },
          ].map((f) => (
            <Card key={f.title} className="p-6 border-border/60">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-navy">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <QuoteFunnel startWith="partner" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
