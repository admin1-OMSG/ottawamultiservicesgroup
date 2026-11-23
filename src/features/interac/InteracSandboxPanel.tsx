import { useEffect, useRef, useState } from "react";

type VerificationStatus = "not_started" | "pending" | "sandbox_verified" | "retry";
type VerificationState = { available: boolean; status: VerificationStatus };

function isVerificationState(value: unknown): value is VerificationState {
  if (!value || typeof value !== "object") return false;
  return (
    "available" in value &&
    typeof value.available === "boolean" &&
    "status" in value &&
    ["not_started", "pending", "sandbox_verified", "retry"].some(
      (status) => status === value.status,
    )
  );
}

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-50";

export function InteracSandboxPanel({
  accessToken,
  language,
}: {
  accessToken: string;
  language: "en" | "fr";
}) {
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [verification, setVerification] = useState<VerificationState | "loading" | "error">(
    "loading",
  );
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<"rate_limit" | "failed" | null>(null);
  const [reload, setReload] = useState(0);
  const pendingStart = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setVerification("loading");
    setStartError(null);
    setConsent(false);
    setStarting(false);
    async function readStatus() {
      try {
        const response = await fetch("/api/interac/status", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data: unknown = await response.json();
        if (!isVerificationState(data)) throw new Error();
        if (!controller.signal.aborted) setVerification(data);
      } catch {
        if (!controller.signal.aborted) setVerification("error");
      }
    }
    void readStatus();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setReload((count) => count + 1);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      controller.abort();
      pendingStart.current?.abort();
      pendingStart.current = null;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [accessToken, reload]);

  async function start() {
    if (
      pendingStart.current ||
      !consent ||
      typeof verification !== "object" ||
      !verification.available ||
      verification.status === "sandbox_verified"
    )
      return;
    const controller = new AbortController();
    pendingStart.current = controller;
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch("/api/interac/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, locale: language === "fr" ? "fr-CA" : "en-CA" }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 429) {
        if (!controller.signal.aborted) setStartError("rate_limit");
        return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json();
      const url = new URL(data.url);
      if (
        url.origin !== "https://gateway-portal.hub-verify.innovation.interac.ca" ||
        url.username ||
        url.password
      )
        throw new Error();
      if (!controller.signal.aborted) window.location.assign(url.href);
    } catch {
      if (!controller.signal.aborted) setStartError("failed");
    } finally {
      if (!controller.signal.aborted) {
        pendingStart.current = null;
        setStarting(false);
      }
    }
  }

  return (
    <section
      aria-labelledby="interac-test-title"
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
    >
      <h2 id="interac-test-title" className="text-lg font-bold">
        {t("Interac identity verification test", "Vérification d’identité Interac en mode essai")}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-6 text-slate-700" aria-live="polite">
        {verification === "loading" ? (
          <p>{t("Loading test status…", "Chargement du statut de l’essai…")}</p>
        ) : verification === "error" ? (
          <>
            <p>
              {t(
                "Your test status could not be loaded.",
                "Le statut de votre essai est indisponible.",
              )}
            </p>
            <button
              type="button"
              className="font-semibold text-teal-800 underline"
              onClick={() => setReload((count) => count + 1)}
            >
              {t("Reload test status", "Recharger le statut de l’essai")}
            </button>
          </>
        ) : verification.status === "sandbox_verified" ? (
          <p className="font-semibold text-teal-800">
            {t(
              "Simulation completed with a test identity.",
              "Simulation réussie avec une identité fictive.",
            )}
          </p>
        ) : !verification.available ? (
          <p>
            {t(
              "The Interac test is not available yet. You can still use your OMSG application.",
              "L’essai Interac n’est pas encore disponible. Votre dossier OMSG reste accessible.",
            )}
          </p>
        ) : (
          <>
            {verification.status === "pending" && (
              <p>
                {t(
                  "A test was started. You can start it again if needed.",
                  "Un essai a déjà été lancé. Vous pouvez le recommencer au besoin.",
                )}
              </p>
            )}
            {verification.status === "retry" && (
              <p>
                {t(
                  "The previous test did not complete. You can start a new test.",
                  "L’essai précédent n’a pas abouti. Vous pouvez recommencer.",
                )}
              </p>
            )}
            <p>
              {t(
                "Use only the test identity and simulated banking details provided by Interac. You may skip this step and continue with the manual OMSG application review.",
                "Utilisez uniquement l’identité fictive et les données bancaires de simulation fournies par Interac. Vous pouvez ignorer cette étape et poursuivre l’examen manuel de votre dossier OMSG.",
              )}
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
                checked={consent}
                disabled={starting}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                {t(
                  "I agree to run the Interac simulation and share its result with OMSG.",
                  "J’accepte de lancer la simulation Interac et d’en partager le résultat avec OMSG.",
                )}
              </span>
            </label>
            <button
              type="button"
              className={buttonClass}
              disabled={starting || !consent}
              onClick={() => void start()}
            >
              {starting
                ? t("Opening Interac…", "Ouverture d’Interac…")
                : t("Start Interac test", "Lancer l’essai Interac")}
            </button>
            {startError && (
              <p role="alert" className="text-red-800">
                {startError === "rate_limit"
                  ? t(
                      "The test limit has been reached. Try again later.",
                      "La limite d’essais est atteinte. Réessayez plus tard.",
                    )
                  : t(
                      "Interac could not be opened. Please try again later.",
                      "Impossible d’ouvrir Interac. Veuillez réessayer plus tard.",
                    )}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
