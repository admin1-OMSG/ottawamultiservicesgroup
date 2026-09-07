import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, MapPin, Send, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { EmailVerification } from "@/components/email-verification";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers | Ottawa Multiservices Group" },
      {
        name: "description",
        content:
          "Explore career opportunities with Ottawa Multiservices Group across cleaning, moving, landscaping, snow removal and other field services in Ottawa-Gatineau.",
      },
      { property: "og:title", content: "Careers at Ottawa Multiservices Group" },
      {
        property: "og:description",
        content: "Join a growing local multiservice team serving Ottawa-Gatineau.",
      },
      { property: "og:url", content: "/careers" },
    ],
    links: [{ rel: "canonical", href: "/careers" }],
  }),
  component: CareersPage,
});

const serviceAreas = [
  "Cleaning",
  "Moving",
  "Landscaping & gardening",
  "Snow removal",
  "Mobile car detailing",
  "Mobile tire change",
  "General labour & property services",
];

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  position_interest: "",
  employment_type: "",
  availability: "",
  experience: "",
  has_drivers_license: "",
  has_vehicle: "",
  authorized_to_work_canada: "",
  omsg_relationship: "no",
  languages: "",
  preferred_language: "en",
  message: "",
};

type CareerForm = typeof initialForm;

const fieldClass =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

function CareersPage() {
  const [form, setForm] = useState<CareerForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeWarning, setResumeWarning] = useState("");
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  function updateField<K extends keyof CareerForm>(key: K, value: CareerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setResumeWarning("");

    const normalizedEmail = form.email.trim().toLowerCase();

    if (!verificationToken) {
      setError(
        form.preferred_language === "fr"
          ? "Veuillez vérifier votre adresse courriel avant d’envoyer votre candidature."
          : "Please verify your email address before submitting your application.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const applicationId = crypto.randomUUID();
      const { data: submittedId, error: submitError } = await supabase.rpc(
        "submit_verified_career_application",
        {
          p_email: normalizedEmail,
          p_token: verificationToken,
          p_payload: {
            id: applicationId,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone: form.phone.trim(),
            city: form.city.trim() || null,
            position_interest: form.position_interest,
            employment_type: form.employment_type || null,
            availability: form.availability.trim() || null,
            experience: form.experience.trim() || null,
            has_drivers_license:
              form.has_drivers_license === ""
                ? null
                : form.has_drivers_license === "yes",
            has_vehicle:
              form.has_vehicle === "" ? null : form.has_vehicle === "yes",
            authorized_to_work_canada:
              form.authorized_to_work_canada === ""
                ? null
                : form.authorized_to_work_canada === "yes",
            omsg_relationship: form.omsg_relationship,
            languages: form.languages.trim() || null,
            preferred_language: form.preferred_language,
            message: form.message.trim() || null,
          },
        },
      );

      if (submitError) throw submitError;

      const finalApplicationId = String(submittedId || applicationId);

      if (resumeFile) {
        const body = new FormData();
        body.append("email", normalizedEmail);
        body.append("token", verificationToken);
        body.append("application_id", finalApplicationId);
        body.append("file", resumeFile);

        const { data: uploadResult, error: uploadError } = await supabase.functions.invoke(
          "upload-career-resume",
          { body },
        );

        if (uploadError || !uploadResult?.ok) {
          console.error("Career resume upload failed:", uploadError || uploadResult);
          setResumeWarning(
            form.preferred_language === "fr"
              ? "Votre candidature a bien été envoyée, mais le CV n’a pas pu être téléversé. Vous pourrez nous le transmettre séparément."
              : "Your application was submitted, but the resume could not be uploaded. You can send it to us separately.",
          );
        }
      }

      const { data: notificationResult, error: notificationError } =
        await supabase.functions.invoke("send-crm-email", {
          body: {
            type: "career_application_received",
            applicationId: finalApplicationId,
          },
        });

      if (notificationError || !notificationResult?.ok) {
        console.error(
          "Career notification email failed:",
          notificationError || notificationResult,
        );
      }

      setForm(initialForm);
      setVerificationToken(null);
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      setSuccess(true);
    } catch (err) {
      console.error("Career application submission failed:", err);
      setError(
        form.preferred_language === "fr"
          ? "La candidature n’a pas pu être envoyée. Vérifiez que votre courriel est toujours validé, puis réessayez."
          : "The application could not be submitted. Make sure your email is still verified, then try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageHero
        eyebrow="Careers"
        title="Build your next opportunity with Ottawa Multiservices Group."
        subtitle="We are building a dependable local team to serve homes and businesses across Ottawa-Gatineau."
      />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-7 border-border/70 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-accent">Open positions</p>
              <h2 className="mt-2 text-2xl font-bold text-navy">Current opportunities</h2>
              <p className="mt-3 text-muted-foreground">
                We do not have a specific position published on this page right now. New opportunities will be posted here as our service operations grow.
              </p>
              <div className="mt-6 rounded-xl border border-border bg-secondary/35 p-4 text-sm text-foreground/75">
                Check back for part-time, full-time, seasonal and on-call opportunities.
              </div>
            </Card>

            <Card className="p-7 border-border/70 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <UsersRound className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-primary">General applications</p>
              <h2 className="mt-2 text-2xl font-bold text-navy">Interested in joining our team?</h2>
              <p className="mt-3 text-muted-foreground">
                We welcome applications from dependable people who would like to be considered for current or future employment opportunities.
              </p>
              <a href="#apply" className="mt-6 inline-flex">
                <Button className="h-11 bg-accent text-accent-foreground">Apply now</Button>
              </a>
            </Card>
          </div>

          <div className="mt-12">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Areas of opportunity</p>
              <h2 className="mt-2 text-3xl font-bold text-navy">Services where our team may grow</h2>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {serviceAreas.map((area) => (
                <Card key={area} className="flex items-center gap-3 p-4 border-border/60">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  <span className="font-medium text-foreground/85">{area}</span>
                </Card>
              ))}
            </div>
          </div>

          <Card id="apply" className="mt-12 scroll-mt-28 p-6 sm:p-8 border-border/70 shadow-soft">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Apply now</p>
              <h2 className="mt-2 text-3xl font-bold text-navy">Career application</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Complete the form below. Fields marked with * are required. You may also attach a resume/CV (PDF, DOC or DOCX, up to 5 MB).
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-navy">Contact information</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    First name *
                    <input className={fieldClass} required value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Last name *
                    <input className={fieldClass} required value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Email *
                    <input
                      type="email"
                      className={fieldClass}
                      required
                      value={form.email}
                      onChange={(e) => {
                        updateField("email", e.target.value);
                        setVerificationToken(null);
                      }}
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Phone *
                    <input type="tel" className={fieldClass} required value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  </label>
                  <label className="text-sm font-medium text-foreground sm:col-span-2">
                    City
                    <input className={fieldClass} value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Ottawa, Gatineau, etc." />
                  </label>
                  <div className="sm:col-span-2">
                    <EmailVerification
                      email={form.email}
                      purpose="career"
                      language={form.preferred_language as "en" | "fr"}
                      token={verificationToken}
                      onVerified={setVerificationToken}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy">Employment interest</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Area / position of interest *
                    <select className={fieldClass} required value={form.position_interest} onChange={(e) => updateField("position_interest", e.target.value)}>
                      <option value="">Select an area</option>
                      {serviceAreas.map((area) => <option key={area} value={area}>{area}</option>)}
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Preferred employment type
                    <select className={fieldClass} value={form.employment_type} onChange={(e) => updateField("employment_type", e.target.value)}>
                      <option value="">Select</option>
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="on_call">On-call</option>
                      <option value="flexible">Flexible / open to options</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground sm:col-span-2">
                    Availability
                    <textarea className={`${fieldClass} min-h-24 resize-y`} value={form.availability} onChange={(e) => updateField("availability", e.target.value)} placeholder="Days, evenings, weekends, start date, etc." />
                  </label>
                  <label className="text-sm font-medium text-foreground sm:col-span-2">
                    Relevant experience
                    <textarea className={`${fieldClass} min-h-28 resize-y`} value={form.experience} onChange={(e) => updateField("experience", e.target.value)} placeholder="Tell us about your experience, skills or certifications." />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy">Work requirements</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <YesNoSelect label="Do you have a valid driver's licence?" value={form.has_drivers_license} onChange={(value) => updateField("has_drivers_license", value)} />
                  <YesNoSelect label="Do you have access to a vehicle?" value={form.has_vehicle} onChange={(value) => updateField("has_vehicle", value)} />
                  <YesNoSelect label="Are you legally authorized to work in Canada?" value={form.authorized_to_work_canada} onChange={(value) => updateField("authorized_to_work_canada", value)} />
                  <label className="text-sm font-medium text-foreground">
                    Do you currently work with Ottawa Multiservices Group Inc.?
                    <select className={fieldClass} value={form.omsg_relationship} onChange={(e) => updateField("omsg_relationship", e.target.value)}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                      <option value="worked_before">I have worked with OMSG before</option>
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy">Resume / CV</h3>
                <div className="mt-4">
                  <label className="text-sm font-medium text-foreground">
                    Attach your resume (optional)
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className={`${fieldClass} file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground`}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setError("");
                        setResumeFile(null);

                        if (!file) return;

                        const allowedTypes = new Set([
                          "application/pdf",
                          "application/msword",
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        ]);
                        const allowedExtension = /\.(pdf|doc|docx)$/i.test(file.name);

                        if ((!allowedTypes.has(file.type) && !allowedExtension) || file.size > 5 * 1024 * 1024) {
                          setError(
                            form.preferred_language === "fr"
                              ? "Le CV doit être un fichier PDF, DOC ou DOCX de 5 Mo maximum."
                              : "The resume must be a PDF, DOC or DOCX file no larger than 5 MB.",
                          );
                          e.target.value = "";
                          return;
                        }

                        setResumeFile(file);
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your resume is stored privately and is accessible only to authorized OMSG administrators.
                  </p>
                  {resumeFile && (
                    <p className="mt-2 text-sm text-foreground/80">
                      Selected: <span className="font-medium">{resumeFile.name}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy">Languages & additional information</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Languages spoken
                    <input className={fieldClass} value={form.languages} onChange={(e) => updateField("languages", e.target.value)} placeholder="English, French, Arabic..." />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Preferred language
                    <select className={fieldClass} value={form.preferred_language} onChange={(e) => updateField("preferred_language", e.target.value)}>
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground sm:col-span-2">
                    Additional message
                    <textarea className={`${fieldClass} min-h-28 resize-y`} value={form.message} onChange={(e) => updateField("message", e.target.value)} placeholder="Anything else you would like us to know?" />
                  </label>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-2xl text-xs text-muted-foreground">
                    By submitting this application, you agree that Ottawa Multiservices Group Inc. may use the information provided to assess employment opportunities and contact you regarding your application.
                  </p>
                  <Button
                    type="submit"
                    disabled={submitting || !verificationToken}
                    className="h-11 shrink-0 bg-accent text-accent-foreground"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit application"}
                  </Button>
                </div>

                {success && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    Thank you. Your application has been submitted successfully. Our team will contact you if your profile matches an opportunity.
                  </div>
                )}

                {resumeWarning && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {resumeWarning}
                  </div>
                )}
              </div>
            </form>
          </Card>

          <Card className="mt-12 p-6 sm:p-8 border-border/60 bg-secondary/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold text-navy">
                  <MapPin className="h-5 w-5 text-accent" /> Ottawa-Gatineau
                </div>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Opportunities may vary by season, client demand, service area and operational requirements.
                </p>
              </div>
              <Link to="/partners">
                <Button variant="outline" className="border-accent/40 text-accent">Looking for subcontracting?</Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function YesNoSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium text-foreground">
      {label}
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}
