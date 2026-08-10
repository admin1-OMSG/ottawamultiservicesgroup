import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Ottawa Multi Services Group" },
      { name: "description", content: "Contact Ottawa Multi Services Group for cleaning, moving, landscaping, snow removal and more. Serving Ottawa-Gatineau seven days a week." },
      { property: "og:title", content: "Contact — Ottawa MSG" },
      { property: "og:description", content: "Contact our team seven days a week." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [pending, setPending] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <PageHero eyebrow="Contact" title="We'd love to hear from you." subtitle="Reach our team by phone, email or the form below. We reply within one business day." />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid gap-4">
            {[
              { icon: Phone, title: "Phone", body: "(613) 407-6699" },
              { icon: Mail,  title: "Email", body: "hello@ottawamultiservicesgroup.com" },
              { icon: MapPin, title: "Service Area", body: "Ottawa · Gatineau · Kanata · Orleans · Barrhaven · Nepean · Stittsville" },
              { icon: Clock, title: "Hours", body: "Mon–Sat 7am–8pm · Sun by appointment" },
            ].map((c) => (
              <Card key={c.title} className="p-5 border-border/60 flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center shrink-0"><c.icon className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy">{c.title}</div>
                  <div className="text-sm text-muted-foreground break-words">{c.body}</div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 md:p-8 border-border/60 shadow-soft">
            <h2 className="text-2xl font-bold text-navy">Send us a message</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget as HTMLFormElement);
                const name = String(data.get("name") ?? "").trim();
                const email = String(data.get("email") ?? "").trim();
                const message = String(data.get("message") ?? "").trim();
                if (!name || !email || !message) { toast.error("Please fill in all required fields."); return; }
                if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Please enter a valid email."); return; }
                setPending(true);
                setTimeout(() => { setPending(false); toast.success("Message sent — we'll reply shortly."); (e.currentTarget as HTMLFormElement | null)?.reset?.(); }, 600);
              }}
              className="mt-6 grid gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-sm font-semibold text-navy">Name *</Label><Input name="name" required maxLength={80} className="mt-2 h-11" /></div>
                <div><Label className="text-sm font-semibold text-navy">Email *</Label><Input name="email" type="email" required maxLength={120} className="mt-2 h-11" /></div>
              </div>
              <div><Label className="text-sm font-semibold text-navy">Phone</Label><Input name="phone" type="tel" maxLength={30} className="mt-2 h-11" /></div>
              <div><Label className="text-sm font-semibold text-navy">Message *</Label><Textarea name="message" required rows={5} maxLength={1000} className="mt-2" /></div>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending} className="bg-accent text-accent-foreground hover:brightness-105 h-11 px-6">
                  {pending ? "Sending…" : "Send Message"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
