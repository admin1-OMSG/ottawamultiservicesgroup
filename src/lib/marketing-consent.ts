// Optional advertising only. Service forms, the CRM and language preferences do not
// depend on this choice. Keep this module independent of React for SSR and tests.
export const MARKETING_CONSENT_KEY = "omsg-marketing-consent";
export const MARKETING_CONSENT_EVENT = "omsg:marketing-consent";
export const PRIVACY_PREFERENCES_EVENT = "omsg:privacy-preferences";
export const MARKETING_CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
const PIXEL_ID = "1556611312829197";

export type MarketingConsent = { version: 1; status: "accepted" | "rejected"; timestamp: number };
type Pixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: Pixel;
  loaded?: boolean;
  version?: string;
};
type PixelWindow = Window & { fbq?: Pixel; _fbq?: Pixel };
let memoryChoice: MarketingConsent | null = null;
let useMemoryChoice = false;
let script: HTMLScriptElement | null = null;
let sdkReady = false;
let initialized = false;
let trackingActive = false;
let lastPage: string | null = null;
let pendingLeads: string[] = [];
let navigationAllowsTracking = true;

const PUBLIC_PATHS = new Set([
  "/", "/about", "/services", "/blog", "/contact", "/faq", "/quote",
  "/terms", "/privacy", "/data-deletion", "/pricing", "/pricing-policy",
  "/pricing/residential", "/pricing/commercial", "/pricing/estimate",
  "/house-cleaning-ottawa", "/commercial-cleaning-ottawa", "/moving-services-ottawa",
  "/snow-removal-ottawa", "/landscaping-ottawa", "/handyman-ottawa",
  "/mobile-car-detailing-ottawa", "/mobile-tire-change-ottawa",
]);
const SERVICES = new Set([
  "cleaning", "detailing", "lawn", "moving", "snow", "tire", "handyman",
  "office", "commercial-snow", "commercial-lawn", "property", "janitorial",
  "residential", "commercial",
]);
const SERVICE_LABELS: Record<string, string> = {
  "House Cleaning": "cleaning", "Office Cleaning": "office", "Vehicle Detailing": "detailing",
  "Lawn & Landscaping": "lawn", "Snow Removal": "snow", "Moving Services": "moving",
  "Mobile Tire Change": "tire", "Handyman & Maint.": "handyman", "Commercial Snow": "commercial-snow",
  "Commercial Lawn": "commercial-lawn", "Property Maintenance": "property", "Janitorial Services": "janitorial",
};
const PLANS = new Set(["weekly", "biweekly", "monthly", "recurring", "flexible", "once", "deep", "extras", "specialist"]);
const PUBLIC_ANCHORS = new Set(["", "#plans", "#services", "#quote", "#quote-form-start", "#calculator", "#estimate", "#contact"]);

export function parseMarketingConsent(raw: string | null, now = Date.now()): MarketingConsent | null {
  try {
    const value = JSON.parse(raw ?? "null") as MarketingConsent | null;
    if (value?.version !== 1 || !["accepted", "rejected"].includes(value.status)) return null;
    if (!Number.isFinite(value.timestamp) || value.timestamp > now || now - value.timestamp >= MARKETING_CONSENT_MAX_AGE) return null;
    return value;
  } catch { return null; }
}

export function getMarketingConsent(): MarketingConsent | null {
  if (typeof window === "undefined") return null;
  if (useMemoryChoice) return parseMarketingConsent(JSON.stringify(memoryChoice));
  try { return parseMarketingConsent(window.localStorage.getItem(MARKETING_CONSENT_KEY)); }
  catch { return parseMarketingConsent(JSON.stringify(memoryChoice)); }
}

// An allowlist avoids sending portal identifiers, application details, auth tokens
// or arbitrary search values to Meta. Ordinary campaign attribution is supported.
export function isPublicMarketingUrl(href: string, origin = "https://ottawamultiservicesgroup.com"): boolean {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || !PUBLIC_PATHS.has(url.pathname.replace(/\/$/, "") || "/")) return false;
    if (!PUBLIC_ANCHORS.has(url.hash)) return false;
    for (const [key, value] of url.searchParams) {
      if (key === "audience" && ["residential", "commercial"].includes(value)) continue;
      if (key === "plan" && PLANS.has(value)) continue;
      if (/^utm_(source|medium|campaign|term|content|id)$/.test(key) && /^[a-zA-Z0-9_.~+ -]{1,180}$/.test(value)) continue;
      if (key === "fbclid" && /^[a-zA-Z0-9_-]{1,512}$/.test(value)) continue;
      return false;
    }
    return true;
  } catch { return false; }
}

function allowedNow(): boolean {
  if (typeof window === "undefined" || !navigationAllowsTracking || getMarketingConsent()?.status !== "accepted") return false;
  if (!isPublicMarketingUrl(window.location.href, window.location.origin)) return false;
  // Meta also reads the referrer. Do not expose a private previous OMSG page or
  // an authentication/contact value accidentally present in an incoming URL.
  const referrer = document.referrer;
  if (!referrer) return true;
  try {
    const url = new URL(referrer);
    if (url.origin === window.location.origin) return isPublicMarketingUrl(referrer, window.location.origin);
    if (url.hash || [...url.searchParams.keys()].some(key => /email|phone|token|password|signature|customer|request/i.test(key))) return false;
    return true;
  } catch { return false; }
}

function removeAdvertisingCookies() {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`];
  if (host.endsWith(".ottawamultiservicesgroup.com")) domains.push(".ottawamultiservicesgroup.com");
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      try { document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`; }
      catch { /* Browsers may disallow cookies. */ }
    }
  }
}

export function suspendMarketingTracking() {
  pendingLeads = [];
  trackingActive = false;
  lastPage = null;
  if (typeof window !== "undefined") {
    const pixel = (window as PixelWindow).fbq;
    if (pixel) {
      // No events are queued while the library downloads. Clear any pending
      // configuration as well, then leave the SDK in the revoked state.
      if (!sdkReady && pixel.queue) pixel.queue.length = 0;
      pixel("consent", "revoke");
    }
    removeAdvertisingCookies();
  }
}

export function guardMarketingNavigation(href: string) {
  if (typeof window === "undefined") return;
  navigationAllowsTracking = isPublicMarketingUrl(href, window.location.origin);
  if (!navigationAllowsTracking) suspendMarketingTracking();
}

export function reloadMarketingConsentFromStorage() {
  useMemoryChoice = false;
  memoryChoice = null;
}

function flushAllowedEvents() {
  if (!sdkReady || !allowedNow()) return;
  const pixel = (window as PixelWindow).fbq;
  if (!pixel) return;
  if (!initialized) {
    pixel("set", "autoConfig", false, PIXEL_ID);
    pixel("init", PIXEL_ID); // No automatic advanced matching or customer fields.
    initialized = true;
  }
  if (!trackingActive) { pixel("consent", "grant"); trackingActive = true; }
  const page = window.location.href;
  if (lastPage !== page) { pixel("track", "PageView"); lastPage = page; }
  for (const service of pendingLeads.splice(0)) {
    if (allowedNow()) pixel("track", "Lead", { content_name: service, content_category: "Quote Request" });
  }
}

export function syncMarketingTracking() {
  if (!allowedNow()) { suspendMarketingTracking(); return; }
  if (sdkReady) { flushAllowedEvents(); return; }
  if (script) return;

  const pixelWindow = window as PixelWindow;
  const pixel: Pixel = Object.assign(function (...args: unknown[]) {
    if (pixel.callMethod) pixel.callMethod(...args);
    else pixel.queue.push(args);
  }, { queue: [] as unknown[][], loaded: true, version: "2.0" });
  pixel.push = pixel;
  pixelWindow.fbq = pixel;
  pixelWindow._fbq = pixel;
  pixel("consent", "revoke");
  pixel("set", "autoConfig", false, PIXEL_ID);
  script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.dataset.omsgMarketing = "true";
  script.onload = () => {
    sdkReady = true;
    // Recheck consent AND URL here: either can change while downloading.
    if (allowedNow()) flushAllowedEvents();
    else suspendMarketingTracking();
  };
  script.onerror = () => { script?.remove(); script = null; pendingLeads = []; };
  document.head.appendChild(script);
}

export function setMarketingConsent(status: MarketingConsent["status"]) {
  if (typeof window === "undefined") return;
  memoryChoice = { version: 1, status, timestamp: Date.now() };
  try { window.localStorage.setItem(MARKETING_CONSENT_KEY, JSON.stringify(memoryChoice)); useMemoryChoice = false; }
  catch { useMemoryChoice = true; /* The choice still works when storage is blocked. */ }
  syncMarketingTracking();
  window.dispatchEvent(new Event(MARKETING_CONSENT_EVENT));
}

export function openPrivacyPreferences() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PRIVACY_PREFERENCES_EVENT));
}

export function trackQuoteLead(service: string) {
  // Never accept names, emails, free text, addresses, prices or form answers.
  const key = SERVICES.has(service) ? service : SERVICE_LABELS[service];
  if (!key || !SERVICES.has(key) || !allowedNow()) return;
  pendingLeads.push(key);
  syncMarketingTracking();
}
