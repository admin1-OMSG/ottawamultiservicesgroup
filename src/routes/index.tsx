import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck2,
  Camera,
  Car,
  Check,
  FileCheck2,
  Hammer,
  Leaf,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import heroCleaning from "@/assets/omsg-hero-cleaning.jpg";
import homeBanner from "@/assets/omsg-home-banner.png";
import tireServiceImg from "@/assets/omsg-tire-service.png";
import servicesBanner from "@/assets/omsg-services-banner.png";
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
      { title: "Ottawa Multiservices Group Inc. | Home & Property Services" },
      { name: "description", content: "Request a clear quote for cleaning, moving, landscaping, snow removal, mobile detailing and property services across Ottawa and Gatineau." },
      { property: "og:title", content: "Ottawa Multiservices Group Inc. | Home & Property Services" },
      { property: "og:description", content: "One trusted team for home and property services across Ottawa and Gatineau." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Ottawa Multiservices Group Inc.",
        url: "https://ottawamultiservicesgroup.com",
        telephone: "+1-613-407-6699",
        email: "info@ottawamultiservicesgroup.com",
        areaServed: ["Ottawa", "Kanata", "Orleans", "Barrhaven", "Nepean", "Stittsville", "Gatineau"],
        address: { "@type": "PostalAddress", addressLocality: "Ottawa", addressRegion: "ON", addressCountry: "CA" },
      }),
    }],
  }),
  component: HomePage,
});

const services = [
  { title: "House Cleaning", body: "Regular, deep, move-in and move-out cleaning.", icon: Sparkles, image: heroCleaning },
  { title: "Lawn & Landscaping", body: "Mowing, trimming, cleanups and garden care.", icon: Leaf },
  { title: "Snow Removal", body: "Residential and commercial seasonal service.", icon: Snowflake },
  { title: "Moving Services", body: "Local moving, loading and packing support.", icon: Truck },
  { title: "Mobile Tire Change", body: "Seasonal tire changes conveniently at your location.", icon: Car, image: tireServiceImg },
  { title: "Small Repairs", body: "Practical handyman and property maintenance help.", icon: Hammer },
];

function HomePage() {
  const scrollToFunnel = () => document.getElementById("funnel")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <SiteHeader variant="transparent" />

      <section className="relative isolate min-h-[720px] overflow-hidden sm:min-h-[760px] lg:min-h-[780px]">
        <img
          src={homeBanner}
          alt="Ottawa Multiservices Group services: cleaning, post-construction cleaning, car wash, garden maintenance, tire change, moving, snow removal and small renovations"
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,22,52,.78)_0%,rgba(7,22,52,.68)_38%,rgba(7,22,52,.30)_68%,rgba(7,22,52,.08)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background/20 to-transparent" />

        <div className="relative mx-auto flex min-h-[720px] max-w-7xl items-center px-4 pb-20 pt-28 sm:min-h-[760px] sm:px-6 sm:pt-32 lg:min-h-[780px] lg:px-8">
          <div className="max-w-3xl">
            <Badge className="mb-5 border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm hover:bg-white/10 sm:text-[11px]">
              One Company. Multiple Solutions. All Seasons.
            </Badge>
            <h1 className="font-display text-4xl font-extrabold leading-[1.02] text-white sm:text-5xl md:text-6xl lg:text-[68px]">
              Everything You Need. <span className="text-accent">One Trusted Team.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg md:text-xl">
              Professional services for homes, businesses and vehicles across Ottawa & Gatineau.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" onClick={scrollToFunnel} className="h-13 rounded-xl bg-accent px-6 text-base font-bold text-accent-foreground shadow-xl hover:brightness-105 sm:w-auto">
                Get My Free Quote <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a href="tel:+16134076699" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/18">
                <Phone className="h-4 w-4" /> (613) 407-6699
              </a>
            </div>

            <div className="mt-9 grid max-w-2xl gap-3 text-sm text-white/82 sm:grid-cols-3">
              <TrustPill icon={FileCheck2} text="Clear written quotes" />
              <TrustPill icon={CalendarCheck2} text="Online scheduling" />
              <TrustPill icon={Camera} text="Before & after photos" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-10 pb-8 sm:-mt-14 sm:pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid overflow-hidden rounded-2xl border border-border bg-white shadow-lift sm:grid-cols-3">
            {[
              ["One company", "Multiple home & property services"],
              ["One portal", "Quotes, appointments & invoices"],
              ["One local team", "Ottawa & Gatineau service area"],
            ].map(([title, body], i) => (
              <div key={title} className={`p-5 sm:p-6 ${i > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}>
                <div className="font-display font-bold text-navy">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader eyebrow="Our services" title="Practical help for your home, property and vehicle" align="left" />
            <Link to="/services" className="inline-flex items-center text-sm font-semibold text-navy hover:text-accent">View all services <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </div>
          <div className="mt-8 rounded-2xl border border-border bg-white p-1.5 shadow-soft sm:p-2">
            <img
              src={servicesBanner}
              alt="Ottawa Multiservices Group service overview"
              className="block h-auto w-full object-contain object-left"
            />
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.title} to="/quote" className="group relative min-h-[255px] overflow-hidden rounded-2xl border border-white/20 bg-navy shadow-soft">
                {service.image ? (
                  <img src={service.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover brightness-[1.12] saturate-[1.05] transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.20),transparent_42%),linear-gradient(145deg,#163c70,#2f6ca8)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/35 to-transparent" />
                <div className="relative flex h-full min-h-[255px] flex-col justify-end p-6 text-white">
                  <div className="mb-auto grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-white/12 backdrop-blur-sm"><service.icon className="h-5 w-5 text-accent" /></div>
                  <h3 className="font-display text-xl font-bold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{service.body}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-accent">Get a quote <ArrowRight className="ml-1.5 h-4 w-4" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sand/55 py-14 sm:py-18 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
          <div>
            <SectionHeader eyebrow="Why clients choose this process" title="Professional service without the usual back-and-forth" align="left" />
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">From the first request to the final invoice, your information stays organized. You can send photos, review the quote, choose a time, sign electronically and keep your documents in one place.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                "Free quote requests",
                "Upload photos with your request",
                "Estimated duration before approval",
                "Choose an available appointment",
                "Electronic quote acceptance",
                "Invoices and service history in your portal",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-sm"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><Check className="h-3.5 w-3.5" /></span><span className="text-sm font-medium text-navy">{item}</span></div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden rounded-3xl border-border/60 bg-navy p-0 text-white shadow-lift">
            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              {[
                { icon: Camera, number: "01", title: "Tell us what you need", body: "Choose your service, answer a few questions and add useful photos." },
                { icon: FileCheck2, number: "02", title: "Review your quote", body: "See the price, estimated duration and service details before accepting." },
                { icon: CalendarCheck2, number: "03", title: "Choose your appointment", body: "Select an available time that works for you." },
                { icon: UserRoundCheck, number: "04", title: "Follow everything online", body: "Access signed quotes, interventions, photos and invoices in your portal." },
              ].map((step) => (
                <div key={step.number} className="bg-navy p-6 sm:p-7">
                  <div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-accent"><step.icon className="h-5 w-5" /></div><span className="font-display text-3xl font-extrabold text-white/12">{step.number}</span></div>
                  <h3 className="mt-6 font-display text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{step.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="funnel" className="scroll-mt-24 py-14 sm:py-18 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Start here</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">Tell us what you need</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Answer a few questions so we can prepare a more accurate quote. You can also add photos to help us understand the job.</p>
          </div>
          <QuoteFunnel />
        </div>
      </section>

      <section className="bg-secondary/55 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-3xl border border-border bg-white p-6 shadow-soft sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Local service</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy">Serving Ottawa, Gatineau and surrounding communities</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Need to confirm that we serve your neighbourhood? Call or email us and we’ll let you know before you request a quote.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href="tel:+16134076699" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-white hover:brightness-110"><Phone className="h-4 w-4" />(613) 407-6699</a>
                <a href="mailto:info@ottawamultiservicesgroup.com" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-navy hover:bg-secondary"><Mail className="h-4 w-4" />Email us</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {["Ottawa", "Kanata", "Orléans", "Barrhaven", "Nepean", "Stittsville", "Gatineau", "Manotick", "Rockcliffe"].map((area) => (
                <div key={area} className="flex items-center gap-2 rounded-xl bg-secondary/75 px-3 py-3 text-sm font-medium text-navy"><MapPin className="h-4 w-4 shrink-0 text-accent" />{area}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-navy p-7 text-white shadow-lift sm:p-10 md:flex md:items-center md:justify-between md:gap-10">
            <div className="max-w-2xl">
              <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">Client Portal</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold">Your quotes, appointments and invoices — in one place</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">Return anytime to review signed quotes, scheduled services, work photos and invoices.</p>
            </div>
            <Link to="/portal" className="mt-6 block shrink-0 md:mt-0"><Button size="lg" className="h-12 w-full rounded-xl bg-accent px-6 font-bold text-accent-foreground md:w-auto">Open Client Portal <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function TrustPill({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3.5 py-3 backdrop-blur-sm"><Icon className="h-4 w-4 shrink-0 text-accent" /><span>{text}</span></div>;
}

function SectionHeader({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "left" | "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">{title}</h2>
    </div>
  );
}
