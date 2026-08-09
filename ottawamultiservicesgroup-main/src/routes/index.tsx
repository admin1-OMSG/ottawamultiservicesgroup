import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Award, MapPin, Users, Star, ArrowRight, LogIn, UserPlus } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QuoteFunnel } from "@/components/quote-funnel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ottawa Multi Services Group | Cleaning, Moving, Snow & More" },
      { name: "description", content: "Get a free quote in minutes from Ottawa's trusted multi-service team: cleaning, moving, landscaping, snow removal, mobile detailing and maintenance." },
      { property: "og:title", content: "Ottawa Multi Services Group | Cleaning, Moving, Snow & More" },
      { property: "og:description", content: "Get a free quote in minutes from Ottawa's trusted multi-service team: cleaning, moving, landscaping, snow removal, mobile detailing and maintenance." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Ottawa Multi Services Group",
        url: "https://ottawamultiservicesgroup.com",
        areaServed: ["Ottawa","Kanata","Orleans","Barrhaven","Nepean","Stittsville","Gatineau"],
        address: { "@type": "PostalAddress", addressLocality: "Ottawa", addressRegion: "ON", addressCountry: "CA" },
        priceRange: "$$",
      }),
    }],
  }),
  component: HomePage,
});

function HomePage() {
  const scrollToFunnel = () => document.getElementById("funnel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <SiteHeader variant="transparent" />

      <section className="relative isolate overflow-hidden">
        <img src={heroImg} alt="Ottawa Multi Services Group crew — cleaning, landscaping and snow removal" width={1920} height={1080}
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-36 lg:py-44">
          <Badge className="bg-accent text-accent-foreground hover:bg-accent border-0 mb-6 uppercase tracking-wider text-[11px] font-semibold px-3 py-1">Serving Ottawa–Gatineau</Badge>
          <h1 className="max-w-3xl font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05]">
            Ottawa's trusted multi-service team: cleaning, moving, maintenance &amp; more.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">
            Get a free quote in minutes — or join our network of professional partners across the National Capital Region.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={scrollToFunnel} className="bg-accent text-accent-foreground hover:brightness-105 shadow-lift h-12 px-6 text-base font-semibold">
              Get a Free Quote <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link to="/partners">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base font-semibold border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                Become a Partner
              </Button>
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/80">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Fully insured &amp; bonded</span>
            <span className="inline-flex items-center gap-2"><Award className="h-4 w-4 text-accent" /> Satisfaction guaranteed</span>
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> Local Ottawa experts</span>
          </div>
        </div>
      </section>

      <section id="funnel" className="relative -mt-10 md:-mt-16 pb-16">
        <div className="mx-auto max-w-6xl px-4"><QuoteFunnel /></div>
      </section>

      <section className="py-20 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeader eyebrow="Why choose us" title="Reliable service, one partner for every job" />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Insured & Bonded",       body: "Full coverage on every job for total peace of mind." },
              { icon: Users,       title: "Professional Team",      body: "Background-checked, trained and uniformed crews." },
              { icon: Award,       title: "Satisfaction Guaranteed",body: "Not happy? We come back and make it right." },
              { icon: MapPin,      title: "Local Ottawa Experts",   body: "Rooted in the community from Kanata to Orleans." },
            ].map((f) => (
              <Card key={f.title} className="p-6 border-border/60 hover:shadow-soft transition-shadow">
                <div className="h-11 w-11 rounded-lg bg-accent/15 text-accent grid place-items-center"><f.icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-semibold text-navy">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeader eyebrow="Testimonials" title="What Ottawa homeowners & businesses say" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: "Sarah M.",   area: "Kanata",   body: "Best cleaning team we've had. On time, thorough, and genuinely friendly." },
              { name: "David R.",   area: "Orleans",  body: "Seasonal snow contract has been a game changer. Driveway is always clear before work." },
              { name: "Maple Café", area: "Downtown", body: "Reliable janitorial team — our storefront has never looked better." },
            ].map((t) => (
              <Card key={t.name} className="p-6 border-border/60">
                <div className="flex gap-1 text-accent">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/90">"{t.body}"</p>
                <div className="mt-5 text-sm">
                  <div className="font-semibold text-navy">{t.name}</div>
                  <div className="text-muted-foreground">{t.area}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr] items-center">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">Service Areas</p>
              <h2 className="mt-2 text-3xl font-bold">Proudly serving the National Capital Region</h2>
              <p className="mt-3 text-white/75 text-sm">From Kanata to Orleans, and across the river to Gatineau — we've got the region covered.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {["Kanata","Orleans","Barrhaven","Nepean","Stittsville","Gatineau","Downtown Ottawa","Rockcliffe","Manotick"].map((a) => (
                <div key={a} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                  <MapPin className="h-4 w-4 text-accent" /> {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Card className="p-8 md:p-12 border-border/60 bg-gradient-to-br from-secondary/60 to-background">
            <div className="grid gap-8 md:grid-cols-[2fr_1fr] items-center">
              <div>
                <Badge className="bg-navy text-navy-foreground border-0">Client Portal</Badge>
                <h2 className="mt-4 text-3xl font-bold text-navy">Manage bookings, invoices and faster quotes</h2>
                <p className="mt-3 text-muted-foreground">Create an account to track your services, download invoices and re-book in one click.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Link to="/portal"><Button size="lg" className="w-full bg-accent text-accent-foreground hover:brightness-105 h-12"><UserPlus className="mr-2 h-4 w-4" /> Create Account</Button></Link>
                <Link to="/portal"><Button size="lg" variant="outline" className="w-full h-12"><LogIn className="mr-2 h-4 w-4" /> Sign In</Button></Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <p className="text-accent text-xs font-semibold uppercase tracking-widest">{eyebrow}</p>
      <h2 className="mt-2 text-3xl md:text-4xl font-bold text-navy">{title}</h2>
    </div>
  );
}
