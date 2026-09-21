import { useEffect, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useLanguage } from "@/lib/language";
import {
  getMarketingConsent, guardMarketingNavigation, isPublicMarketingUrl, MARKETING_CONSENT_EVENT,
  MARKETING_CONSENT_KEY, MARKETING_CONSENT_MAX_AGE, PRIVACY_PREFERENCES_EVENT,
  reloadMarketingConsentFromStorage, setMarketingConsent, syncMarketingTracking,
} from "@/lib/marketing-consent";

export function MarketingConsent() {
  const { language } = useLanguage();
  const router = useRouter();
  const href = useRouterState({ select: state => state.location.href });
  const [visible, setVisible] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [status, setStatus] = useState<"accepted" | "rejected" | null>(null);
  const fr = language === "fr";

  useEffect(() => {
    let expiryTimer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const choice = getMarketingConsent();
      setStatus(choice?.status ?? null);
      setVisible(!choice && isPublicMarketingUrl(window.location.href, window.location.origin));
      syncMarketingTracking();
      clearTimeout(expiryTimer);
      if (choice) {
        const remaining = choice.timestamp + MARKETING_CONSENT_MAX_AGE - Date.now();
        expiryTimer = setTimeout(refresh, Math.min(Math.max(remaining, 1), 2_147_000_000));
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === MARKETING_CONSENT_KEY || event.key === null) {
        reloadMarketingConsentFromStorage();
        refresh();
      }
    };
    const open = () => { setReopened(true); setVisible(true); };
    guardMarketingNavigation(window.location.href);
    refresh();
    window.addEventListener(MARKETING_CONSENT_EVENT, refresh);
    window.addEventListener(PRIVACY_PREFERENCES_EVENT, open);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    // Suspend during navigation to a private page. The current browser URL is
    // also checked before every event and again when the SDK finishes loading.
    const unsubscribe = router.subscribe("onBeforeNavigate", event => {
      guardMarketingNavigation(event.toLocation.href);
    });
    return () => {
      clearTimeout(expiryTimer);
      window.removeEventListener(MARKETING_CONSENT_EVENT, refresh);
      window.removeEventListener(PRIVACY_PREFERENCES_EVENT, open);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      unsubscribe();
    };
  }, [href, router]);

  if (!visible) return null;
  const choose = (choice: "accepted" | "rejected") => {
    setMarketingConsent(choice);
    setVisible(false);
    setReopened(false);
  };

  return (
    <aside data-i18n-ignore="true" role="region" aria-label={fr ? "Préférences de confidentialité" : "Privacy preferences"}
      className="fixed inset-x-3 bottom-16 z-[110] mx-auto max-h-[70dvh] max-w-4xl overflow-y-auto rounded-2xl border border-teal-200 bg-white p-4 text-slate-800 shadow-xl sm:inset-x-6 sm:bottom-6 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-950">{fr ? "Votre choix pour les témoins publicitaires" : "Your choice for advertising cookies"}</p>
          <p className="mt-1 text-sm leading-relaxed">
            {fr ? "Avec votre accord, le Pixel Meta nous aide à mesurer nos publicités Facebook et Instagram et à personnaliser la publicité. Vous pouvez refuser et utiliser tous nos services."
              : "With your permission, the Meta Pixel helps measure our Facebook and Instagram ads and personalize advertising. You can refuse and still use all our services."}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {fr ? "Les fonctions nécessaires au site restent actives. Votre choix est conservé 180 jours et peut être modifié en bas de page."
              : "Essential site functions stay active. We remember your choice for 180 days; change it anytime in the footer."}
          </p>
          {reopened && <p className="mt-2 text-xs font-medium">{fr ? "Choix actuel : " : "Current choice: "}{status === "accepted" ? (fr ? "autorisé" : "allowed") : status === "rejected" ? (fr ? "refusé" : "refused") : (fr ? "non défini" : "not set")}</p>}
        </div>
        {reopened && <button type="button" onClick={() => { setVisible(false); setReopened(false); }} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">{fr ? "Fermer" : "Close"}</button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => choose("rejected")} className="min-h-11 rounded-lg border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50">{fr ? "Refuser" : "Refuse"}</button>
        <button type="button" onClick={() => choose("accepted")} className="min-h-11 rounded-lg border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50">{fr ? "Accepter" : "Accept"}</button>
        <Link to="/privacy" className="px-1 py-2 text-sm text-teal-800 underline underline-offset-4">{fr ? "Politique de confidentialité" : "Privacy policy"}</Link>
      </div>
    </aside>
  );
}
