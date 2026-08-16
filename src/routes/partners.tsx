import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, BriefcaseBusiness, CheckCircle2, HardHat, Handshake, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Toaster } from "@/components/ui/sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartnerApplicationForm, type PartnerApplicationMode } from "@/components/quote-funnel";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Work With Us | Ottawa Multiservices Group" },
      { name: "description", content: "Join Ottawa Multiservices Group as a service partner, independent worker or company, or contact us for subcontracting support on your service contracts." },
      { property: "og:title", content: "Work With Ottawa Multiservices Group" },
      { property: "og:description", content: "Service partners, workers, companies and subcontracting opportunities across Ottawa-Gatineau." },
      { property: "og:url", content: "/partners" },
    ],
    links: [{ rel: "canonical", href: "/partners" }],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const [mode, setMode] = useState<PartnerApplicationMode | null>(null);

  const openForm = (next: PartnerApplicationMode) => {
    setMode(next);
    window.setTimeout(() => {
      const section = document.getElementById("partner-form");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        const firstField = section?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        firstField?.focus({ preventScroll: true });
      }, 450);
    }, 40);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <PageHero
        eyebrow="Work With Us"
        title="Two ways to partner with Ottawa Multiservices Group."
        subtitle="Join our service network to find work, or bring us in as a subcontractor to help fulfill your contracts."
      />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-7 border-border/70 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent"><HardHat className="h-6 w-6" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-accent">Service partners & workers</p>
              <h2 className="mt-2 text-2xl font-bold text-navy">I want to work with OMSG</h2>
              <p className="mt-3 text-muted-foreground">
                For self-employed professionals, service companies, crews and job seekers looking for opportunities in our service categories.
              </p>
              <div className="mt-5 grid gap-2 text-sm text-foreground/80 sm:grid-cols-2">
                {["Residential & commercial cleaning","Vehicle detailing / car wash","Landscaping & gardening","Snow removal","Moving","Mobile tire change","Small repairs / renovation","Other related field work"].map(x=><div key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent"/><span>{x}</span></div>)}
              </div>
              <Button onClick={() => openForm("service_provider")} className="mt-7 h-11 bg-accent text-accent-foreground">Join our service network</Button>
            </Card>

            <Card className="p-7 border-border/70 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-6 w-6" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-primary">Business subcontracting</p>
              <h2 className="mt-2 text-2xl font-bold text-navy">I need OMSG as a subcontractor</h2>
              <p className="mt-3 text-muted-foreground">
                For companies, property managers and contractors that need a reliable team to perform part or all of a service contract.
              </p>
              <div className="mt-5 grid gap-2 text-sm text-foreground/80">
                {["One-time, recurring or seasonal contracts","Cleaning and property service support","Overflow capacity for your existing contracts","Ottawa, Gatineau and surrounding areas"].map(x=><div key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><span>{x}</span></div>)}
              </div>
              <Button onClick={() => openForm("subcontracting_client")} variant="outline" className="mt-7 h-11 border-primary text-primary hover:bg-primary/5">Submit a subcontracting opportunity</Button>
            </Card>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <Card className="p-5"><UsersRound className="h-5 w-5 text-accent"/><h3 className="mt-3 font-semibold">Build our local network</h3><p className="mt-1 text-sm text-muted-foreground">Maintain a searchable pool of skilled people and companies by service and coverage area.</p></Card>
            <Card className="p-5"><BriefcaseBusiness className="h-5 w-5 text-accent"/><h3 className="mt-3 font-semibold">Match the right capacity</h3><p className="mt-1 text-sm text-muted-foreground">Find suitable collaborators when demand, geography or specialization requires extra support.</p></Card>
            <Card className="p-5"><Handshake className="h-5 w-5 text-accent"/><h3 className="mt-3 font-semibold">Grow through subcontracting</h3><p className="mt-1 text-sm text-muted-foreground">Create relationships with businesses that need OMSG to deliver contracted services.</p></Card>
          </div>
        </div>
      </section>

      <section id="partner-form" className="scroll-mt-[88px] border-y border-border bg-secondary/40 py-10 sm:py-12">
        <div className="mx-auto max-w-4xl px-6">
          {!mode ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-navy">Choose how you want to work with us</h2>
              <p className="mt-2 text-muted-foreground">Select one of the two options above to open the appropriate form.</p>
            </div>
          ) : (
            <>
              <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">{mode === "service_provider" ? "Service partner application" : "Subcontracting opportunity"}</p>
                  <h2 className="mt-2 text-2xl font-bold text-navy">{mode === "service_provider" ? "Tell us how you can work with OMSG" : "Tell us what your company needs"}</h2>
                </div>
                <Button variant="ghost" onClick={() => setMode(mode === "service_provider" ? "subcontracting_client" : "service_provider")}>
                  Switch form
                </Button>
              </div>
              <Card className="p-6 md:p-8">
                <PartnerApplicationForm
                  mode={mode}
                  onSubmitted={() => {
                    setMode(null);
                  }}
                />
              </Card>
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
