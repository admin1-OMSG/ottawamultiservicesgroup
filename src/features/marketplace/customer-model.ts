import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";
export type MarketLanguage = "en" | "fr";
export type MarketRequest = {
  id: string; service: string; city: string; title: string; description: string; urgency: string;
  status: "open" | "completed" | "withdrawn"; created_at: string; is_owner: boolean; preferred_ids: string[]; preferred_names: string[];
};
export type DirectoryProvider = {
  id: string; name: string; services: string[]; service_areas: string[]; city: string; review_status: "approved"; active_at: string | null;
  completed_count: number; review_count: number; average_rating: number | null; google_maps_url: string | null;
};
export type MarketContact = {
  id: string; request_id: string; provider_id: string; provider_name: string; completed_at: string | null; review_rating: number | null;
  review_body: string | null; my_provider: boolean;
};
export type MarketNotice = {
  id: string; kind: "match" | "invitation" | "contact" | "message"; request_id: string; contact_id: string | null;
  provider_name: string | null; request_title: string; created_at: string; read_at: string | null;
};
export const marketInput = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-normal text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";
export const marketPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-900 focus-visible:outline-teal-800 disabled:opacity-50";
export const marketSecondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50";
export function serviceName(key: string, language: MarketLanguage) {
  return PROFESSIONAL_SERVICE_OPTIONS.find((service) => service.value === key)?.[language] ?? key;
}
export function dateLabel(iso: string, language: MarketLanguage, time = false) {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium", ...(time ? { timeStyle: "short" as const } : {}),
  }).format(new Date(iso));
}
export function canadianPhone(value: string) {
  const digits = value.replace(/[\s().-]/g, "");
  if (/^[2-9]\d{9}$/.test(digits)) return "+1" + digits;
  if (/^\+?1[2-9]\d{9}$/.test(digits)) return "+" + digits.replace(/^\+/, "");
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}
export function requestStatus(status: MarketRequest["status"], language: MarketLanguage) {
  const labels = { open: ["Open", "Ouverte"], completed: ["Completed", "Terminée"], withdrawn: ["Withdrawn", "Retirée"] };
  return labels[status][language === "fr" ? 1 : 0];
}
