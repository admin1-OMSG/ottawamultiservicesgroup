import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Terms | Ottawa Multi Services Group" },
      { name: "description", content: "Terms & conditions for using Ottawa Multi Services Group services and website." },
      { property: "og:title", content: "Terms & Terms — Ottawa MSG" },
      { property: "og:description", content: "Terms for using our services and website." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero eyebrow="Legal" title="Terms & Terms" />
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 prose prose-slate max-w-none">
          <p className="text-sm text-muted-foreground">Last updated: July 2026</p>
          <p className="mt-6 text-foreground/90">These terms govern your use of the Ottawa Multi Services Group website and services. By requesting a quote or booking a service, you agree to these terms.</p>

          <h2 className="mt-10 text-2xl font-bold text-navy">Quotes & bookings</h2>
          <p className="mt-3 text-foreground/90">Quotes are estimates based on the information you provide. Endal pricing may be adjusted after an on-site assessment. Bookings are confirmed once you receive written confirmation from our team.</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">Payment</h2>
          <p className="mt-3 text-foreground/90">Payment terms are shared with every quote. Late payments may incur interest at the maximum rate permitted by law.</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">Cancellations</h2>
          <p className="mt-3 text-foreground/90">One-time services may be rescheduled or cancelled up to 24 hours in advance without charge. Recurring contracts follow the cancellation terms in your service agreement.</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">Liability</h2>
          <p className="mt-3 text-foreground/90">We carry commercial liability insurance. Our total liability for any claim is limited to the amount paid for the service in question, except where prohibited by law.</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">Governing law</h2>
          <p className="mt-3 text-foreground/90">These terms are governed by the laws of the Province of Ontario and the federal laws of Canada.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
