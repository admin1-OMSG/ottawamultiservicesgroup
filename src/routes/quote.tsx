import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Toaster } from "@/components/ui/sonner";
import { QuoteFunnel } from "@/components/quote-funnel";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Get a Free Quote | Ottawa Multi Services Group" },
      { name: "description", content: "Answer a few questions and get a free, no-obligation quote for cleaning, moving, landscaping, snow removal, mobile detailing and more across Ottawa-Gatineau." },
      { property: "og:title", content: "Get a Free Quote — Ottawa MSG" },
      { property: "og:description", content: "Free, no-obligation quotes in minutes." },
      { property: "og:url", content: "/quote" },
    ],
    links: [{ rel: "canonical", href: "/quote" }],
  }),
  component: QuotePage,
});

function QuotePage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById("quote-form-start")?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <PageHero eyebrow="Free Quote" title="Tell us what you need — get a quote in minutes." subtitle="Answer a few quick questions and our team will send a personalized estimate within one business day." />
      <section id="quote-form-start" className="scroll-mt-[88px] py-8 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <QuoteFunnel />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
