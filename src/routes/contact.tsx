import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { EmailVerification } from "@/components/email-verification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Phone, Mail, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { sendCrmEmail } from "@/lib/email-notifications";
import { saveContactRequest, type ContactInput } from "@/lib/contact-request";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Ottawa Multiservices Group Inc." },
      {
        name: "description",
        content:
          "Contact Ottawa Multiservices Group Inc. for cleaning, moving, landscaping, snow removal and more in Ottawa and Gatineau.",
      },
      { property: "og:title", content: "Contact — Ottawa Multiservices Group Inc." },
      {
        property: "og:description",
        content:
          "Questions about our services? Contact our team by phone, email or our secure contact form.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [fields, setFields] = useState<ContactInput>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verificationCycle, setVerificationCycle] = useState(0);
  const [pending, setPending] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const submitting = useRef(false);
  const requestId = useRef<string | null>(null);
  const currentEmail = useRef("");
  const normalizedEmail = fields.email.trim().toLowerCase();
  const validEmail = /^\S+@\S+\.\S+$/.test(normalizedEmail);

  function changeField(key: keyof ContactInput, value: string) {
    if (key === "email") {
      currentEmail.current = value.trim().toLowerCase();
      if (currentEmail.current !== normalizedEmail) setVerificationToken(null);
    }
    setFields((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || savedId || !verificationToken) return;
    submitting.current = true;
    setPending(true);
    setError(false);
    const id = requestId.current ?? crypto.randomUUID();
    requestId.current = id;
    try {
      await saveContactRequest(fields, verificationToken, id, language, (name, args) =>
        supabase.rpc(name, args),
      );
      setSavedId(id);
      // The confirmed CRM record remains authoritative even if the admin email fails.
      // This existing event notifies the team only; it does not send a quote to the visitor.
      void sendCrmEmail({ type: "quote_requested", requestId: id }).catch(() => undefined);
    } catch {
      // Keep all entered text intact, including when the server response is uncertain.
      setError(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <main data-i18n-ignore="true" data-no-auto-translate="true">
        <PageHero
          eyebrow="Contact"
          title={t("Let's talk about what you need.", "Parlons de vos besoins.")}
          subtitle={t(
            "Contact our team by phone, email or the form below. For a service price, you can also request a free quote.",
            "Contactez notre équipe par téléphone, par courriel ou avec le formulaire ci-dessous. Pour connaître le prix d’un service, vous pouvez aussi demander un devis gratuit.",
          )}
        />
        <section className="py-12 md:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-10">
            <div className="grid min-w-0 grid-cols-1 content-start gap-4">
              {[
                {
                  icon: Phone,
                  title: t("Phone", "Téléphone"),
                  body: "(613) 407-6699",
                  href: "tel:+16134076699",
                },
                {
                  icon: Mail,
                  title: t("Email", "Courriel"),
                  body: "info@ottawamultiservicesgroup.com",
                  href: "mailto:info@ottawamultiservicesgroup.com",
                },
                {
                  icon: MapPin,
                  title: t("Service area", "Région desservie"),
                  body: "Ottawa · Gatineau · Kanata · Orléans · Barrhaven · Nepean · Stittsville",
                },
                {
                  icon: Clock,
                  title: t("Appointments", "Rendez-vous"),
                  body: t(
                    "Service dates and times are confirmed with our team, according to availability.",
                    "Les dates et heures d’intervention sont confirmées avec notre équipe, selon les disponibilités.",
                  ),
                },
              ].map((card) => (
                <Card key={card.title} className="flex items-start gap-4 border-border/60 p-5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                    <card.icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-navy">{card.title}</h2>
                    {card.href ? (
                      <a
                        className="mt-1 block [overflow-wrap:anywhere] text-sm leading-6 text-teal-800 underline underline-offset-4"
                        href={card.href}
                      >
                        {card.body}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.body}</p>
                    )}
                  </div>
                </Card>
              ))}
              <Link
                to="/quote"
                className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm font-semibold text-primary underline underline-offset-4"
              >
                {t(
                  "Looking for a price? Request a free quote →",
                  "Vous cherchez un prix ? Demandez un devis gratuit →",
                )}
              </Link>
            </div>

            <Card className="min-w-0 border-border/60 p-6 shadow-soft md:p-8">
              {savedId ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl bg-emerald-50 p-6 text-emerald-950"
                >
                  <CheckCircle2 aria-hidden="true" className="mb-3 h-8 w-8" />
                  <h2 className="text-2xl font-bold">
                    {t("Your message has been received.", "Votre message a bien été reçu.")}
                  </h2>
                  <p className="mt-3 leading-7">
                    {t(
                      "Your message is saved for our team to review. We will contact you using the details you provided. Sending this message does not create a booking or a service contract.",
                      "Votre message est enregistré pour notre équipe. Nous vous contacterons aux coordonnées indiquées. Son envoi ne crée ni réservation ni contrat de service.",
                    )}
                  </p>
                  <p className="mt-4 break-all text-xs">
                    {t("Message reference", "Référence du message")} : {savedId}
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-navy">
                    {t("Send us a message", "Envoyez-nous un message")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t(
                      "Fields marked * are required. Verify your email address before sending.",
                      "Les champs marqués d’un * sont obligatoires. Vérifiez votre adresse courriel avant l’envoi.",
                    )}
                  </p>
                  <form onSubmit={submit} className="mt-6 grid gap-5">
                    <fieldset disabled={pending} className="grid min-w-0 gap-5">
                      <legend className="sr-only">
                        {t("Your contact details and message", "Vos coordonnées et votre message")}
                      </legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="contact-name" className="font-semibold text-navy">
                            {t("Full name", "Nom complet")} *
                          </Label>
                          <Input
                            id="contact-name"
                            name="name"
                            autoComplete="name"
                            required
                            maxLength={100}
                            value={fields.name}
                            onChange={(event) => changeField("name", event.target.value)}
                            className="mt-2 h-11"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact-email" className="font-semibold text-navy">
                            {t("Email", "Courriel")} *
                          </Label>
                          <Input
                            id="contact-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            maxLength={254}
                            value={fields.email}
                            onChange={(event) => changeField("email", event.target.value)}
                            className="mt-2 h-11"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="contact-phone" className="font-semibold text-navy">
                          {t("Phone (optional)", "Téléphone (facultatif)")}
                        </Label>
                        <Input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          maxLength={40}
                          value={fields.phone}
                          onChange={(event) => changeField("phone", event.target.value)}
                          className="mt-2 h-11"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-message" className="font-semibold text-navy">
                          Message *
                        </Label>
                        <Textarea
                          id="contact-message"
                          name="message"
                          required
                          rows={6}
                          maxLength={3000}
                          value={fields.message}
                          onChange={(event) => changeField("message", event.target.value)}
                          className="mt-2"
                        />
                      </div>
                      {validEmail && (
                        <EmailVerification
                          key={`${normalizedEmail}:${verificationCycle}`}
                          email={normalizedEmail}
                          purpose="quote"
                          language={language}
                          token={verificationToken}
                          onVerified={(token) => {
                            // Ignore an earlier email's response if the visitor edited the address.
                            if (currentEmail.current === normalizedEmail)
                              setVerificationToken(token);
                          }}
                        />
                      )}
                      <p className="text-sm leading-6 text-muted-foreground">
                        {t(
                          "We use these details to respond to your message. This form does not subscribe you to marketing emails. ",
                          "Ces renseignements servent à répondre à votre message. Ce formulaire ne vous inscrit pas aux courriels promotionnels. ",
                        )}
                        <Link
                          to="/privacy"
                          className="font-medium text-primary underline underline-offset-4"
                        >
                          {t("Privacy policy", "Politique de confidentialité")}
                        </Link>
                      </p>
                    </fieldset>
                    {error && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"
                      >
                        <p>
                          {t(
                            "We could not confirm that your message was saved. Your text has been kept. Try again, or contact us by phone or email using the links on this page.",
                            "Nous n’avons pas pu confirmer l’enregistrement de votre message. Votre texte a été conservé. Réessayez ou contactez-nous par téléphone ou courriel avec les liens de cette page.",
                          )}
                        </p>
                        <button
                          type="button"
                          className="mt-2 font-semibold underline underline-offset-4"
                          onClick={() => {
                            setVerificationToken(null);
                            setVerificationCycle((cycle) => cycle + 1);
                          }}
                        >
                          {t(
                            "Request a new email verification code",
                            "Demander un nouveau code de vérification",
                          )}
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:items-end">
                      <Button
                        type="submit"
                        disabled={pending || !verificationToken}
                        className="h-11 bg-accent px-6 text-accent-foreground hover:brightness-105"
                      >
                        {pending
                          ? t("Sending…", "Envoi…")
                          : t("Send message", "Envoyer le message")}
                      </Button>
                      {!verificationToken && (
                        <p className="text-xs leading-5 text-muted-foreground">
                          {t(
                            "Verify your email address to enable sending.",
                            "Vérifiez votre adresse courriel pour activer l’envoi.",
                          )}
                        </p>
                      )}
                    </div>
                  </form>
                </>
              )}
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
