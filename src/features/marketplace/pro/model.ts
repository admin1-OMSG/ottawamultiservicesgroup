import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";

import type { CreditOffer } from "../credit-offer";

export type Language = "en" | "fr";
export type Translate = (en:string,fr:string) => string;
export interface MarketLead {
  id:string; title:string; description:string; service:string; city:string;
  urgency:"asap"|"week"|"flexible"; status:"open"|"completed"|"withdrawn"; credit_cost:number|null;
  created_at:string; client_active_at:string|null; email_verified:boolean; phone_verified:boolean;
  is_owner:boolean; matched:boolean; invited:boolean;
  repeat_client?:boolean; details_updated_at?:string|null;
}
export interface Reply {
  id:string; request_id:string; provider_id:string; request_title:string; credit_cost:number;
  request?:MarketLead; created_at:string; completed_at:string|null;
  client_email:string|null; client_phone:string|null;
}
export type Offer = CreditOffer;
export interface Wallet {
  paid_subscriber?:boolean; phone_verified?:boolean;
  balance:number; discount_percent:number; preview_checkout_enabled:boolean; packs:Offer[];
  subscription:{status:string;offer_code:string}|null;
  refunds:{contact_id:string;status:string;reason:string;note?:string}[];
}

export type Sort = "newest"|"oldest"|"urgency"|"category"|"active"|"verified";
export type Filters = {category:string;urgency:string;verified:string;active:string;age:string;sort:Sort};
export const defaultFilters:Filters={category:"",urgency:"",verified:"",active:"",age:"",sort:"newest"};
const day=86400000;
const urgencyOrder={asap:0,week:1,flexible:2};

export function serviceName(value:string,language:Language) {
  return PROFESSIONAL_SERVICE_OPTIONS.find(service => service.value===value)?.[language] ?? value;
}
export function urgencyName(value:MarketLead["urgency"],t:Translate) {
  return {asap:t("As soon as possible","Dès que possible"),week:t("This week","Cette semaine"),flexible:t("Flexible","Flexible")}[value];
}
export function dateText(value:string,language:Language) {
  return new Intl.DateTimeFormat(language==="fr"?"fr-CA":"en-CA",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value));
}
export function credits(count:number,t:Translate) {
  return count===1?t("1 credit","1 crédit"):count+t(" credits"," crédits");
}
export function isRecentlyActive(date:string|null,days:number,now=Date.now()) {
  return date!==null && Date.parse(date)>=now-days*day;
}
export function visibleLeads(leads:MarketLead[],filters:Filters,language:Language,now=Date.now()) {
  const verifiedCount=(lead:MarketLead)=>Number(lead.email_verified)+Number(lead.phone_verified);
  return leads.filter(lead=>{
    if(lead.is_owner || lead.status!=="open") return false;
    if(filters.category && lead.service!==filters.category) return false;
    if(filters.urgency && lead.urgency!==filters.urgency) return false;
    if(filters.verified==="email" && !lead.email_verified) return false;
    if(filters.verified==="phone" && !lead.phone_verified) return false;
    if(filters.verified==="both" && verifiedCount(lead)!==2) return false;
    if(filters.active && !isRecentlyActive(lead.client_active_at,Number(filters.active),now)) return false;
    return !filters.age || isRecentlyActive(lead.created_at,Number(filters.age),now);
  }).sort((a,b)=>{
    const newest=Date.parse(b.created_at)-Date.parse(a.created_at);
    switch(filters.sort) {
      case "oldest":return -newest;
      case "urgency":return urgencyOrder[a.urgency]-urgencyOrder[b.urgency]||newest;
      case "active":return Date.parse(b.client_active_at??"1970-01-01")-Date.parse(a.client_active_at??"1970-01-01")||newest;
      case "verified":return verifiedCount(b)-verifiedCount(a)||newest;
      case "category":return serviceName(a.service,language).localeCompare(serviceName(b.service,language),language)||newest;
      default:return newest;
    }
  });
}

const pendingDestination="omsg-professional-alert";
const notificationId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function validDestination(kind: string, id: unknown): id is string {
  if (typeof id !== "string") return false;
  if (kind === "offer") return /^[a-z][a-z0-9_]{0,47}$/.test(id);
  return (kind === "contact" || kind === "lead") && notificationId.test(id);
}

export function rememberProfessionalDestination() {
  try {
    const query = new URLSearchParams(window.location.search);
    const kind = query.has("contact") ? "contact" : query.has("lead") ? "lead" : "offer";
    const id = query.get(kind);
    if (validDestination(kind, id)) {
      window.localStorage.removeItem("omsg.marketplace.returnTo");
      window.localStorage.setItem(pendingDestination, JSON.stringify({ kind, id, expires: Date.now() + 30 * 60 * 1000 }));
    } else {
      forgetProfessionalDestination();
    }
  } catch { /* Browser storage is optional for sign-in. */ }
}

export function savedProfessionalDestination(): URLSearchParams | null {
  try {
    const raw = window.localStorage.getItem(pendingDestination);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved && typeof saved.expires === "number" && saved.expires > Date.now() &&
      validDestination(saved.kind, saved.id)) {
      return new URLSearchParams({ [saved.kind]: saved.id });
    }
  } catch { /* Ignore invalid or unavailable storage. */ }
  forgetProfessionalDestination();
  return null;
}

export function professionalDestination() {
  const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  if (query.has("contact") || query.has("lead") || query.has("checkout") || query.has("offer")) return query;
  return savedProfessionalDestination() ?? query;
}
export function forgetProfessionalDestination() {
  try {window.localStorage.removeItem(pendingDestination);} catch { /* Storage is optional. */ }
}
