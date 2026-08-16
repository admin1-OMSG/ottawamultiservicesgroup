import { useMemo, useState } from "react";
import {
  Sparkles, Truck, Snowflake, Leaf, Car, Wrench, Building2, Home, Users,
  ArrowRight, CheckCircle2, Phone, Mail, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sendCrmEmail } from "@/lib/email-notifications";
import { useLanguage } from "@/lib/language";


type ServiceKey =
  | "cleaning" | "detailing" | "lawn" | "moving" | "snow" | "tire" | "handyman"
  | "office" | "commercial-snow" | "commercial-lawn" | "property" | "janitorial";

const RES_SERVICES: { key: ServiceKey; label: string; icon: React.ElementType; blurb: string }[] = [
  { key: "cleaning",  label: "House Cleaning",     icon: Sparkles, blurb: "Regular, deep, move in/out" },
  { key: "detailing", label: "Vehicle Detailing",  icon: Car,      blurb: "Mobile interior & exterior" },
  { key: "lawn",      label: "Lawn & Landscaping", icon: Leaf,     blurb: "Mowing, trimming, cleanups" },
  { key: "snow",      label: "Snow Removal",       icon: Snowflake,blurb: "Per-visit or seasonal" },
  { key: "moving",    label: "Moving Services",    icon: Truck,    blurb: "Local, packing, loading" },
  { key: "tire",      label: "Mobile Tire Change", icon: Wrench,   blurb: "Seasonal swap at your door" },
  { key: "handyman",  label: "Handyman & Maint.",  icon: Home,     blurb: "Small jobs, fast fixes" },
];

const COM_SERVICES: { key: ServiceKey; label: string; icon: React.ElementType; blurb: string }[] = [
  { key: "office",           label: "Office Cleaning",       icon: Building2, blurb: "Daily & scheduled cleans" },
  { key: "commercial-snow",  label: "Commercial Snow",       icon: Snowflake, blurb: "Lots, walkways, salting" },
  { key: "commercial-lawn",  label: "Commercial Lawn",       icon: Leaf,      blurb: "Contracts for properties" },
  { key: "property",         label: "Property Maintenance",  icon: Wrench,    blurb: "General upkeep & repairs" },
  { key: "janitorial",       label: "Janitorial Services",   icon: Sparkles,  blurb: "Full-service janitorial" },
];


type ClientKind = "residential" | "commercial" | null;
type AnswerValue = string | string[];

export function QuoteFunnel() {
  const [clientKind, setClientKind] = useState<ClientKind>(null);
  const [service, setService] = useState<ServiceKey | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [showContact, setShowContact] = useState(false);

  const services = clientKind === "commercial" ? COM_SERVICES : RES_SERVICES;
  const activeService = useMemo(() => services.find((s) => s.key === service), [services, service]);
  const setA = (k: string, v: AnswerValue) => setAnswers((p) => ({ ...p, [k]: v }));
  const reset = () => { setClientKind(null); setService(null); setAnswers({}); setShowContact(false); };
  const chooseService = (kind: Exclude<ClientKind, null>, key: ServiceKey) => {
    setClientKind(kind);
    setService(key);
    setAnswers({});
  };

  return (
    <Card className="p-6 md:p-10 shadow-lift border-border/60">
      <Stepper service={service} showContact={showContact} />

      {!service && (
        <StepBlock title="Choose a service" subtitle="Select what you need and we'll ask a few quick questions to prepare an accurate quote.">
          <div className="space-y-8">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Home className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-navy">Home, vehicle & everyday services</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {RES_SERVICES.map((s) => (
                  <ServiceTile key={s.key} icon={s.icon} title={s.label} blurb={s.blurb} onClick={() => chooseService("residential", s.key)} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-navy">Business & property services</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {COM_SERVICES.map((s) => (
                  <ServiceTile key={s.key} icon={s.icon} title={s.label} blurb={s.blurb} onClick={() => chooseService("commercial", s.key)} />
                ))}
              </div>
            </div>
          </div>
        </StepBlock>
      )}

      {clientKind && service && !showContact && (
        <StepBlock title={activeService?.label ?? ""} subtitle="Answer a few quick questions so we can prepare an accurate quote." onBack={() => { setService(null); setClientKind(null); setAnswers({}); }}>
          <ServiceQuestions serviceKey={service} answers={answers} setA={setA} />
          <div className="mt-8 flex justify-end">
            <Button size="lg" className="bg-accent text-accent-foreground hover:brightness-105 h-12 px-6" onClick={() => setShowContact(true)}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </StepBlock>
      )}

      {clientKind && showContact && (
        <StepBlock title="Great! Where should we send your quote?" subtitle="We'll get back to you within one business day." onBack={() => setShowContact(false)}>
          <ContactForm
            service={activeService?.label ?? ""}
            answers={answers}
            onSubmitted={() => {
              toast.success("Quote request received — we'll contact you soon!");
              reset();
            }}
          />
        </StepBlock>
      )}
    </Card>
  );
}

function Stepper({ service, showContact }: { service: ServiceKey | null; showContact: boolean; }) {
  const steps = ["Service", "Details", "Quote"];
  let current = 0;
  if (service) current = 1;
  if (showContact) current = 2;
  return (
    <div className="mb-8 flex items-center gap-2 text-xs flex-wrap">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`h-6 min-w-6 px-2 rounded-full grid place-items-center font-semibold ${i <= current ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
          <span className={`hidden sm:inline ${i <= current ? "text-navy font-medium" : "text-muted-foreground"}`}>{s}</span>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < current ? "bg-accent" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function StepBlock({ title, subtitle, children, onBack }: { title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void; }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-navy">{title}</h2>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        {onBack && <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">← Back</Button>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function ChoiceTile({ icon: Icon, title, desc, onClick }: { icon: React.ElementType; title: string; desc: string; onClick: () => void; }) {
  return (
    <button onClick={onClick} className="group text-left rounded-xl border border-border bg-card p-6 hover:border-accent hover:shadow-soft transition-all">
      <div className="h-11 w-11 rounded-lg bg-navy text-navy-foreground grid place-items-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-semibold text-navy text-lg">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
      <div className="mt-4 inline-flex items-center text-sm font-medium text-accent">Continue <ArrowRight className="ml-1 h-4 w-4" /></div>
    </button>
  );
}

function ServiceTile({ icon: Icon, title, blurb, onClick }: { icon: React.ElementType; title: string; blurb: string; onClick: () => void; }) {
  return (
    <button onClick={onClick} className="group text-left rounded-xl border border-border bg-card p-5 hover:border-accent hover:shadow-soft transition-all">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary text-navy grid place-items-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-navy truncate">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{blurb}</div>
        </div>
      </div>
    </button>
  );
}

function ServiceQuestions({ serviceKey, answers, setA }: { serviceKey: ServiceKey; answers: Record<string, AnswerValue>; setA: (k: string, v: AnswerValue) => void; }) {
  const q = questionsFor(serviceKey, answers);
  return (
    <div className="grid gap-6">
      {q.map((item) => <QuestionField key={item.id} item={item} value={answers[item.id] ?? ""} onChange={(v) => setA(item.id, v)} />)}
    </div>
  );
}

type QItem = { id: string; label: string; kind: "radio" | "select" | "checkbox"; options: string[] };

function QuestionField({ item, value, onChange }: { item: QItem; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  if (item.kind === "select") {
    return (
      <div>
        <Label className="text-sm font-semibold text-navy">{item.label}</Label>
        <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
          <SelectTrigger className="mt-2 h-11"><SelectValue placeholder="Select an option" /></SelectTrigger>
          <SelectContent>{item.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  if (item.kind === "checkbox") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        <Label className="text-sm font-semibold text-navy">{item.label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">Select all that apply.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.options.map((o) => {
            const active = selected.includes(o);
            return (
              <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${active ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => {
                    const next = event.target.checked ? [...selected, o] : selected.filter((value) => value !== o);
                    onChange(next);
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm">{o}</span>
                {active && <CheckCircle2 className="ml-auto h-4 w-4 text-accent" />}
              </label>
            );
          })}
        </div>
      </div>
    );
  }
  const selectedValue = typeof value === "string" ? value : "";
  return (
    <div>
      <Label className="text-sm font-semibold text-navy">{item.label}</Label>
      <RadioGroup value={selectedValue} onValueChange={onChange} className="mt-3 grid gap-2 sm:grid-cols-2">
        {item.options.map((o) => {
          const active = selectedValue === o;
          return (
            <label key={o} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${active ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"}`}>
              <RadioGroupItem value={o} id={`${item.id}-${o}`} />
              <span className="text-sm">{o}</span>
              {active && <CheckCircle2 className="ml-auto h-4 w-4 text-accent" />}
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

function questionsFor(key: ServiceKey, a: Record<string, AnswerValue>): QItem[] {
  switch (key) {
    case "cleaning": {
      const base: QItem[] = [
        { id: "cleaningType", label: "What type of cleaning do you need?", kind: "radio",
          options: ["Regular Maintenance","Deep Cleaning","Move-In","Move-Out","Airbnb Turnover","Post-Construction"] },
        { id: "propertyType", label: "What is the property type?", kind: "radio",
          options: ["Apartment","House","Townhouse","Condo","Airbnb/Rental"] },
      ];
      if (typeof a.propertyType === "string" && a.propertyType !== "Apartment") {
        base.push(
          { id: "bedrooms",   label: "How many bedrooms?",  kind: "select", options: ["1","2","3","4+"] },
          { id: "bathrooms",  label: "How many bathrooms?", kind: "select", options: ["1","2","3","4+"] },
          { id: "basement",   label: "Do you have a basement?", kind: "radio", options: ["Yes","No"] },
          { id: "stairs",     label: "How many stairs?",    kind: "select", options: ["0","1-5","6-10","10+"] },
          { id: "livingRooms",label: "How many living rooms?", kind: "select", options: ["1","2","3+"] },
        );
      }
      base.push({ id: "frequency", label: "How often do you need this service?", kind: "radio",
        options: ["One-Time","Daily","Weekly","Bi-Weekly","Monthly"] });
      return base;
    }
    case "detailing":
      return [
        { id: "vehicleType", label: "What is the vehicle type?", kind: "radio", options: ["Sedan","SUV","Truck","Minivan","Luxury Vehicle"] },
        { id: "detailService", label: "What service do you require?", kind: "radio", options: ["Exterior Wash","Interior Detailing","Full Detail (Interior + Exterior)"] },
        { id: "extras", label: "Do you need any extra services?", kind: "checkbox", options: ["Odor Removal","Pet Hair Removal","Headlight Restoration","Ceramic Coating"] },
      ];
    case "lawn":
      return [
        { id: "lawnService", label: "What service do you need?", kind: "checkbox", options: ["Lawn Mowing","Hedge Trimming","Spring Cleanup","Fall Cleanup","Weed Removal","Garden Maintenance"] },
        { id: "lawnSize", label: "What is the size of your lawn?", kind: "radio", options: ["Small (Under 1/4 acre)","Medium (1/4 – 1/2 acre)","Large (1/2 – 1 acre)","Extra Large (1+ acres)"] },
        { id: "lawnFrequency", label: "How often?", kind: "radio", options: ["One-Time","Weekly","Bi-Weekly","Monthly"] },
      ];
    case "moving":
      return [
        { id: "moveType", label: "What type of move is this?", kind: "radio", options: ["Residential Move (Local)","Business Move (Office)","Furniture Only","Packing Service"] },
        { id: "residenceSize", label: "What is the size of your current residence?", kind: "select", options: ["Studio","1-Bedroom","2-Bedroom","3-Bedroom","4+ Bedroom","Office"] },
        { id: "packing", label: "Do you need packing materials?", kind: "radio", options: ["Yes, full packing service","Yes, boxes and tape","No, I will pack myself"] },
        { id: "loading", label: "Do you need loading and unloading assistance?", kind: "radio", options: ["Yes","No, just transportation"] },
      ];
    case "snow":
      return [
        { id: "snowArea", label: "What do you need cleared?", kind: "checkbox", options: ["Driveway","Walkway","Entire Property","Roof Raking"] },
        { id: "drivewaySize", label: "What is the size of your driveway?", kind: "radio", options: ["Single Car","Double Car","Triple+ Car"] },
        { id: "snowPlan", label: "What type of service do you prefer?", kind: "radio", options: ["Per Visit (On-Demand)","Seasonal Contract (Unlimited)"] },
      ];
    case "tire":
      return [
        { id: "tireService", label: "Which service do you need?", kind: "radio", options: ["Winter → Summer swap","Summer → Winter swap","Flat Tire Repair","Battery Boost"] },
        { id: "tireVehicle", label: "What is the type of vehicle?", kind: "radio", options: ["Sedan","SUV","Truck"] },
        { id: "onRims", label: "Are the tires already mounted on rims?", kind: "radio", options: ["Yes (On Rims)","No (Off Rims)"] },
      ];
    case "handyman":
      return [
        { id: "job", label: "What kind of job do you need?", kind: "radio", options: ["Small repair","Furniture assembly","Mounting / installation","Painting touch-ups","Other"] },
        { id: "urgency", label: "How urgent is it?", kind: "radio", options: ["This week","Within 2 weeks","Flexible"] },
      ];
    case "office":
      return [
        { id: "sqft", label: "Approximate size of your space?", kind: "select", options: ["Under 1,000 sq ft","1,000–3,000 sq ft","3,000–10,000 sq ft","10,000+ sq ft"] },
        { id: "frequency", label: "How often?", kind: "radio", options: ["Daily","3× per week","Weekly","Bi-Weekly"] },
      ];
    case "commercial-snow":
      return [
        { id: "propertyType", label: "Property type", kind: "radio", options: ["Retail plaza","Office building","Industrial lot","Condo / multi-unit"] },
        { id: "coverage", label: "Coverage needed", kind: "checkbox", options: ["Parking lot","Walkways","Full property + salting"] },
      ];
    case "commercial-lawn":
      return [
        { id: "propertyType", label: "Property type", kind: "radio", options: ["Retail plaza","Office building","Industrial lot","Condo / multi-unit"] },
        { id: "scope", label: "Scope of service", kind: "checkbox", options: ["Mowing only","Full landscape maintenance","Seasonal cleanups"] },
      ];
    case "property":
      return [
        { id: "scope", label: "What do you need help with?", kind: "radio", options: ["General repairs","Preventative maintenance","Turnovers / unit prep","On-call service"] },
      ];
    case "janitorial":
      return [
        { id: "industry", label: "Industry", kind: "radio", options: ["Office","Retail","Medical","Industrial","Other"] },
        { id: "frequency", label: "Frequency", kind: "radio", options: ["Daily","Weekdays","Weekly","Bi-Weekly"] },
      ];
  }
}

function ContactForm({
  service,
  answers,
  onSubmitted,
}: {
  service: string;
  answers: Record<string, AnswerValue>;
  onSubmitted: () => void;
}) {
  const { language } = useLanguage();
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const form = e.currentTarget;
        const data = new FormData(form);

        const fullName = String(data.get("name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const phone = String(data.get("phone") ?? "").trim();
        const address = String(data.get("address") ?? "").trim();
        const contactMethod = String(
          data.get("contactMethod") ?? "Email",
        ).trim();
        const notes = String(data.get("notes") ?? "").trim();

        if (!fullName || !email || !phone || !address) {
          toast.error("Please complete all required fields.");
          return;
        }

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0];

        const lastName =
          nameParts.length > 1
            ? nameParts.slice(1).join(" ")
            : null;

        setPending(true);

        try {
          const requestId = crypto.randomUUID();
          const { error } = await supabase
            .from("service_requests")
            .insert({
              id: requestId,
              first_name: firstName,
              last_name: lastName,
              email,
              phone: phone || null,
              address_line: address,
              province: "Ontario",
              service_name: service || null,
              description: notes || null,
              questionnaire_answers: {
                ...answers,
                preferredContactMethod: contactMethod,
                preferredLanguage: language,
              },
              preferred_language: language,
              status: "new",
              source: "website",
            });

          if (error) {
            console.error("Supabase service request error:", error);

            toast.error(
              "The quote request could not be submitted. Please try again.",
            );

            return;
          }

          for (const [index, photo] of photos.entries()) {
            const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
            const storagePath = `requests/${requestId}/${crypto.randomUUID()}-${safeName}`;
            const { error: uploadError } = await supabase.storage.from("service-photos").upload(storagePath, photo, { contentType: photo.type, upsert: false });
            if (uploadError) throw uploadError;
            const { error: photoRowError } = await supabase.from("service_request_photos").insert({ service_request_id: requestId, storage_path: storagePath, caption: `Photo ${index + 1}` });
            if (photoRowError) throw photoRowError;
          }

          const notification = await sendCrmEmail({
            type: "quote_requested",
            requestId,
          });

          if (!notification.ok) {
            console.warn("Quote saved, but admin email was not sent.");
          }

          form.reset();
          onSubmitted();
        } catch (error) {
          console.error("Unexpected service request error:", error);

          toast.error(
            "A connection error occurred. Please try again.",
          );
        } finally {
          setPending(false);
        }
      }}
      className="grid gap-5"
    >
      {service && (
        <div className="rounded-lg bg-secondary/60 px-4 py-3 text-sm">
          Requesting quote for:{" "}
          <span className="font-semibold text-navy">
            {service}
          </span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" required>
          <Input
            name="name"
            placeholder="Jane Doe"
            required
            maxLength={80}
          />
        </Field>

        <Field label="Email Address" required>
          <Input
            name="email"
            type="email"
            placeholder="jane@example.com"
            required
            maxLength={120}
          />
        </Field>

        <Field label="Phone Number" required>
          <Input
            name="phone"
            type="tel"
            placeholder="(613) 555-0123"
            required
            maxLength={30}
          />
        </Field>

        <Field label="Address or Postal Code" required>
          <Input
            name="address"
            placeholder="K1A 0B1 or full address"
            required
            maxLength={140}
          />
        </Field>
      </div>

      <Field label="Preferred Contact Method">
        <RadioGroup
          name="contactMethod"
          defaultValue="Email"
          className="grid gap-2 sm:grid-cols-3"
        >
          {[
            { v: "Email", i: Mail },
            { v: "Phone", i: Phone },
            { v: "Text", i: MessageSquare },
          ].map((option) => (
            <label
              key={option.v}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:border-accent/60"
            >
              <RadioGroupItem
                value={option.v}
                id={`cm-${option.v}`}
              />

              <option.i className="h-4 w-4 text-navy" />

              <span className="text-sm">{option.v}</span>
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field label="Additional Details">
        <Textarea
          name="notes"
          placeholder="Anything specific we should know?"
          rows={4}
          maxLength={1000}
        />
      </Field>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <Label htmlFor="quotePhotos">Job photos (optional)</Label>
        <p className="mt-1 text-xs text-muted-foreground">Add up to 8 photos to help us prepare a more accurate quote. Maximum 8 MB per photo.</p>
        <Input id="quotePhotos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="mt-3 bg-white" onChange={(e) => { const selected = Array.from(e.target.files ?? []).filter((f) => f.size <= 8 * 1024 * 1024).slice(0, 8); setPhotos(selected); if ((e.target.files?.length ?? 0) > 8) toast.error("Maximum 8 photos."); }} />
        {photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((file) => <div key={`${file.name}-${file.lastModified}`} className="rounded-lg border bg-white p-2 text-xs"><div className="truncate font-medium">{file.name}</div><div className="text-muted-foreground">{(file.size/1024/1024).toFixed(1)} Mo</div></div>)}</div>}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 bg-accent px-8 text-base font-semibold text-accent-foreground hover:brightness-105"
        >
          {pending ? "Sending…" : "Get My Free Quote Now"}
        </Button>
      </div>
    </form>
  );
}

export type PartnerApplicationMode = "service_provider" | "subcontracting_client";

const PARTNER_SERVICES = [
  "Residential Cleaning",
  "Commercial Cleaning",
  "Vehicle Detailing / Car Wash",
  "Landscaping & Gardening",
  "Snow Removal",
  "Moving",
  "Mobile Tire Change",
  "Small Repairs / Renovation",
];

export function PartnerApplicationForm({ mode, onSubmitted }: { mode: PartnerApplicationMode; onSubmitted: () => void }) {
  const { language } = useLanguage();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const fullName = String(data.get("name") ?? "").trim();
        const businessName = String(data.get("business_name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const phone = String(data.get("phone") ?? "").trim();
        const applicantType = String(data.get("applicant_type") ?? "").trim();
        const city = String(data.get("city") ?? "").trim();
        const projectLocation = String(data.get("project_location") ?? "").trim();
        const frequency = String(data.get("frequency") ?? "").trim();
        const startDate = String(data.get("start_date") ?? "").trim();
        const desiredRateRaw = String(data.get("desired_rate") ?? "").trim();
        const contractValueRaw = String(data.get("estimated_contract_value") ?? "").trim();
        const details = String(data.get("details") ?? "").trim();
        const services = data.getAll("services").map(String).filter(Boolean);

        if (!fullName || !email) {
          toast.error("Please provide your contact name and email.");
          return;
        }
        if (services.length === 0) {
          toast.error("Please select at least one service.");
          return;
        }

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Not provided";

        setPending(true);
        try {
          // Generate the UUID in the browser so the public form does not need
          // SELECT permission on partner_applications just to retrieve the new id.
          const applicationId = crypto.randomUUID();
          const { error } = await supabase
            .from("partner_applications")
            .insert({
              id: applicationId,
              application_type: mode,
              applicant_type: mode === "service_provider" ? (applicantType || "self_employed") : "business_client",
              contact_first_name: firstName,
              contact_last_name: lastName,
              business_name: businessName || fullName,
              email,
              phone: phone || null,
              service_areas: services,
              availability: details || null,
              preferred_language: language,
              city: city || null,
              project_location: projectLocation || null,
              frequency: frequency || null,
              start_date: startDate || null,
              desired_rate: desiredRateRaw ? Number(desiredRateRaw) : null,
              estimated_contract_value: contractValueRaw ? Number(contractValueRaw) : null,
              details: details || null,
            });

          if (error) {
            console.error("Supabase partner application error:", error);
            toast.error("The application could not be submitted. Please try again.");
            return;
          }
          const result = await sendCrmEmail({ type: "partner_application_received", applicationId });
          if (!result.ok) console.warn("Partner application email notification failed:", result.error);
          form.reset();
          onSubmitted();
        } catch (error) {
          console.error("Unexpected partner application error:", error);
          toast.error("A connection error occurred. Please try again.");
        } finally {
          setPending(false);
        }
      }}
      className="grid gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact Name" required><Input name="name" required maxLength={100} /></Field>
        <Field label="Business / Organization"><Input name="business_name" maxLength={120} /></Field>
        <Field label="Email" required><Input type="email" name="email" required maxLength={120} /></Field>
        <Field label="Phone"><Input type="tel" name="phone" maxLength={30} /></Field>

        {mode === "service_provider" ? (
          <>
            <Field label="I am">
              <select name="applicant_type" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="self_employed">Self-employed / Independent contractor</option>
                <option value="company">Company / Service business</option>
                <option value="job_seeker">Job seeker / Individual worker</option>
              </select>
            </Field>
            <Field label="City / Service Area"><Input name="city" placeholder="Ottawa, Gatineau, Kanata…" maxLength={120} /></Field>
            <Field label="Desired hourly rate (optional)"><Input name="desired_rate" type="number" min="0" step="0.01" /></Field>
          </>
        ) : (
          <>
            <Field label="Project / Contract Location"><Input name="project_location" placeholder="Ottawa, Gatineau…" maxLength={160} /></Field>
            <Field label="Service Frequency">
              <select name="frequency" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select frequency</option>
                <option value="one_time">One-time contract</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
                <option value="seasonal">Seasonal</option>
                <option value="ongoing">Ongoing / Other</option>
              </select>
            </Field>
            <Field label="Preferred Start Date"><Input name="start_date" type="date" /></Field>
            <Field label="Estimated Contract Value (optional)"><Input name="estimated_contract_value" type="number" min="0" step="0.01" /></Field>
          </>
        )}
      </div>

      <Field label={mode === "service_provider" ? "Services you can provide" : "Services you need"} required>
        <div className="grid gap-2 sm:grid-cols-2">
          {PARTNER_SERVICES.map((serviceName) => (
            <label key={serviceName} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" name="services" value={serviceName} className="h-4 w-4" />
              <span>{serviceName}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label={mode === "service_provider" ? "Experience, availability and additional information" : "Tell us about the contract or project"}>
        <Textarea
          name="details"
          rows={5}
          maxLength={1500}
          placeholder={mode === "service_provider"
            ? "Experience, certifications, availability, equipment, team size…"
            : "Scope of work, expected volume, schedule, special requirements, contract details…"}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="h-12 bg-accent px-8 text-accent-foreground hover:brightness-105">
          {pending ? "Sending…" : mode === "service_provider" ? "Submit Partner Profile" : "Submit Subcontracting Opportunity"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-semibold text-navy">
        {label}{required && <span className="text-accent"> *</span>}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}