import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Ottawa Multi Services Group" },
      { name: "description", content: "How Ottawa Multi Services Group collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — Ottawa MSG" },
      { property: "og:description", content: "How we handle your personal information." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 prose prose-slate max-w-none">
          <p className="text-sm text-muted-foreground">Last updated: July 2026</p>
          <p className="mt-6 text-foreground/90">Ottawa Multi Services Group ("we", "us") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and the choices you have.</p>

          <h2 className="mt-10 text-2xl font-bold text-navy">Information we collect</h2>
          <p className="mt-3 text-foreground/90">When you request a quote, contact us, or create an account, we collect your name, email, phone number, service address and any details you share about the job.</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">How we use it</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2 text-foreground/90">
            <li>To prepare and deliver quotes and services.</li>
            <li>To schedule and communicate about jobs.</li>
            <li>To send invoices and payment receipts.</li>
            <li>To improve our service and, with your consent, to send occasional updates.</li>
          </ul>

          <h2 className="mt-8 text-2xl font-bold text-navy">Sharing</h2>
          <p className="mt-3 text-foreground/90">We do not sell your personal information. We share it only with vetted subcontractors performing your service and with providers that help us run our business (payment processing, scheduling, email).</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">Your choices</h2>
          <p className="mt-3 text-foreground/90">You may request access, correction or deletion of your personal information at any time by emailing <a className="text-accent" href="mailto:privacy@ottawamultiservicesgroup.com">privacy@ottawamultiservicesgroup.com</a>.</p>

          <h2 className="mt-8 text-2xl font-bold text-navy">Contact</h2>
          <p className="mt-3 text-foreground/90">Ottawa Multi Services Group, Ottawa, ON, Canada.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
