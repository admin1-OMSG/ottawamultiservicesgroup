import type { CreditOffer } from "../credit-offer";

export type Language = "en" | "fr";
export type Translate = (english: string, french: string) => string;
export type Refund = {
  contact_id: string;
  request_id: string;
  title?: string | null;
  provider_name: string;
  provider_email?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  credits: number;
  reason: string;
  status: string;
  created_at: string;
  note?: string | null;
  request_note?: string | null;
};
export type Offer = CreditOffer;
export type Partner = { account_id: string; business_name: string; email: string; discount_percent: number };
export type Tariff = { service: string; credits: number | null };
export type AdminData = { refunds: Refund[]; offers: Offer[]; partners: Partner[]; tariffs: Tariff[] };
export type Update = (method: string, args: Record<string, string | boolean | number | null>) => Promise<void>;

export const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-teal-700";
export const buttonClass = "min-h-10 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50";
export const quietButtonClass = "min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function money(cents: number, language: Language) {
  return new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
    style: "currency", currency: "CAD",
  }).format(cents / 100);
}

export function invitation(language: Language, name: string, url: string) {
  if (language === "fr") {
    return {
      subject: "Votre invitation à la plateforme de services OMSG",
      body: `Bonjour${name ? " " + name : ""},\n\nOttawa Multiservices Group lance une plateforme où les clients d’Ottawa–Gatineau pourront publier leurs demandes. Vous pourrez recevoir celles qui correspondent à vos services et à votre zone, puis choisir les clients que vous souhaitez contacter.\n\nComme partenaire de notre réseau actuel, vous pourrez bénéficier d’un tarif préférentiel après vérification de votre dossier. Pour en profiter, créez votre profil professionnel, indiquez vos services et vos zones d’intervention, puis soumettez votre dossier ici :\n${url}\n\nMerci de faire partie de notre réseau,\nL’équipe d’Ottawa Multiservices Group`,
    };
  }
  return {
    subject: "Your invitation to the OMSG service marketplace",
    body: `Hello${name ? " " + name : ""},\n\nOttawa Multiservices Group is launching a marketplace where customers in Ottawa–Gatineau can post service requests. You will receive requests that match your services and coverage area, and choose which customers to contact.\n\nAs an existing partner, you can qualify for preferred pricing once we review your application. Create your professional profile, select your services and coverage areas, and submit your application here:\n${url}\n\nThank you for being part of our network,\nThe Ottawa Multiservices Group team`,
  };
}
