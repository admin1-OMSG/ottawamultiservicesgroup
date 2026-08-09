import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

const POSTS = [
  { title: "The Ultimate Ottawa Spring Cleaning Checklist", tag: "Cleaning", date: "March 15, 2026", excerpt: "Room-by-room checklist to reset your home after a long Ottawa winter — from baseboards to windows." },
  { title: "How to Prepare for a Local Move in Ottawa", tag: "Moving", date: "February 24, 2026", excerpt: "Two weeks of planning made simple: packing order, utilities, elevator bookings and moving-day logistics." },
  { title: "Snow Removal Laws in Ottawa: What Homeowners Need to Know", tag: "Snow", date: "November 12, 2025", excerpt: "By-laws, timelines and best practices for keeping your sidewalks safe and compliant through winter." },
  { title: "When to Book Fall Cleanup (and Why It Matters)", tag: "Landscaping", date: "October 3, 2025", excerpt: "Fall cleanup timing protects your lawn and hardscaping through freeze-thaw. Here's the local playbook." },
  { title: "Winter Tire Change: Everything You Need to Know", tag: "Automotive", date: "September 20, 2025", excerpt: "Ontario timing rules, on-rim vs off-rim swaps, and how our mobile crew handles it in your driveway." },
  { title: "Choosing Between Weekly and Bi-Weekly Cleaning", tag: "Cleaning", date: "August 6, 2025", excerpt: "A quick framework to decide what fits your household, budget and how quickly your home gets dusty." },
];

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog | Ottawa Multi Services Group" },
      { name: "description", content: "Practical guides on cleaning, moving, landscaping, snow removal and home maintenance for Ottawa homeowners and businesses." },
      { property: "og:title", content: "Blog — Ottawa MSG" },
      { property: "og:description", content: "Practical guides for Ottawa homeowners and businesses." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero eyebrow="Blog" title="Ottawa home & business tips from our team." subtitle="Seasonal guides, checklists and how-tos to help you keep your property in great shape year-round." />
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((p) => (
            <Card key={p.title} className="p-6 border-border/60 hover:shadow-soft transition-shadow flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <Badge className="bg-accent/15 text-accent hover:bg-accent/15 border-0">{p.tag}</Badge>
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{p.date}</div>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-navy leading-snug">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{p.excerpt}</p>
              <a href="#" className="mt-4 text-sm font-semibold text-accent">Read more →</a>
            </Card>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
