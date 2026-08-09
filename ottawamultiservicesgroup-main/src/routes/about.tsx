import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Award, MapPin, Users, Target, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Ottawa Multi Services Group" },
      { name: "description", content: "Meet Ottawa Multi Services Group — a local, insured multi-service team serving homeowners, property managers and businesses across the National Capital Region." },
      { property: "og:title", content: "About — Ottawa MSG" },
      { property: "og:description", content: "Local, insured multi-service team serving Ottawa-Gatineau." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero eyebrow="About Us" title="Ottawa's one-call team for the jobs that keep life running." subtitle="We started with a simple idea: one reliable, insured team you can trust for cleaning, moving, landscaping, snow and more — no more juggling ten different contractors." />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 grid gap-8 md:grid-cols-2">
          <Card className="p-8 border-border/60">
            <Target className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-2xl font-bold text-navy">Our Mission</h2>
            <p className="mt-3 text-muted-foreground">To make home and property care simple, transparent and dependable for every household and business in Ottawa-Gatineau.</p>
          </Card>
          <Card className="p-8 border-border/60">
            <Heart className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-2xl font-bold text-navy">Our Vision</h2>
            <p className="mt-3 text-muted-foreground">To be the National Capital Region's most trusted multi-service group — the first name people think of when something needs to get done right.</p>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-navy text-center">What we stand for</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Insured & Bonded", body: "Every job is covered end-to-end." },
              { icon: Award, title: "Certified Crews", body: "Trained, uniformed and background-checked." },
              { icon: Users, title: "Local Team", body: "Ottawa & Gatineau residents on every crew." },
              { icon: MapPin, title: "Full Regional Coverage", body: "Kanata to Orleans, downtown to Gatineau." },
            ].map((v) => (
              <Card key={v.title} className="p-6 border-border/60">
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center"><v.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold text-navy">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
