import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "Are you insured and bonded?", a: "Yes. Ottawa Multi Services Group carries full liability insurance and every crew member is bonded. Certificates are available on request." },
  { q: "What are your rates?", a: "Rates depend on the service, size and frequency. Use our free online quote for an accurate estimate — most clients receive a quote within one business day." },
  { q: "Do you work on weekends?", a: "Yes. We schedule Monday to Saturday 7am–8pm, with Sunday service available by appointment for existing clients and commercial contracts." },
  { q: "Which areas do you serve?", a: "The entire National Capital Region: Ottawa (downtown, Kanata, Orleans, Barrhaven, Nepean, Stittsville) and Gatineau." },
  { q: "Do I need to be home during the service?", a: "Not at all. Many of our recurring clients provide access instructions — our teams are background-checked and fully insured." },
  { q: "What is your cancellation policy?", a: "You can reschedule or cancel most one-time services up to 24 hours in advance at no charge. Recurring contracts include their own flexible terms." },
  { q: "Do you bring your own equipment and supplies?", a: "Yes — cleaning products, landscaping equipment, snow gear and detailing supplies are all included unless you request specific products." },
  { q: "How do I pay?", a: "We accept credit card, e-transfer and cheque. Commercial contracts are invoiced monthly with net-30 terms." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ | Ottawa Multi Services Group" },
      { name: "description", content: "Answers to common questions about Ottawa Multi Services Group: insurance, rates, service areas, scheduling and more." },
      { property: "og:title", content: "FAQ — Ottawa MSG" },
      { property: "og:description", content: "Common questions about our services." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    }],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero eyebrow="FAQ" title="Answers to the questions we hear most." />
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-navy font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
