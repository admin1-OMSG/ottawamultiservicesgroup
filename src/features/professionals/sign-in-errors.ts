// Supabase Auth documents stable codes separately from human-readable messages:
// https://supabase.com/docs/guides/auth/debugging/error-codes
// Never render the original message: it can contain account information or tokens.
type SignInFailure = "rate_limit" | "network" | "restricted" | "disabled" | "server" | "other";

function failureKind(failure: unknown): SignInFailure {
  if (!failure || typeof failure !== "object") return "other";
  const { code, status, name } = failure as { code?: unknown; status?: unknown; name?: unknown };

  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429)
    return "rate_limit";
  if (code === "email_address_not_authorized") return "restricted";
  if (code === "email_provider_disabled" || code === "otp_disabled") return "disabled";
  if (
    code === "unexpected_failure" ||
    code === "request_timeout" ||
    code === "hook_timeout" ||
    code === "hook_timeout_after_retry" ||
    (typeof status === "number" && status >= 500 && status <= 599)
  )
    return "server";

  // AuthRetryableFetchError also represents HTTP 5xx responses; those were handled
  // above. Status 0 means no HTTP response was received by the Auth client.
  if (
    status === 0 ||
    (name === "AuthRetryableFetchError" && status === undefined) ||
    (name === "TypeError" && status === undefined && code === undefined)
  )
    return "network";
  return "other";
}

const MESSAGES: Record<SignInFailure, { en: string; fr: string }> = {
  rate_limit: {
    en: "The email or request limit has been reached. Please wait before trying again. Contact OMSG if the problem continues.",
    fr: "La limite d’envoi de courriels ou de demandes est atteinte. Patientez avant de réessayer. Contactez OMSG si le problème persiste.",
  },
  network: {
    en: "We could not reach the sign-in service. Check your internet connection and try again.",
    fr: "Le service de connexion est injoignable. Vérifiez votre connexion Internet et réessayez.",
  },
  restricted: {
    en: "Delivery of sign-in links is currently restricted. Please contact OMSG for help.",
    fr: "L’envoi des liens de connexion est actuellement restreint. Contactez OMSG pour obtenir de l’aide.",
  },
  disabled: {
    en: "Email sign-in is currently unavailable. Please contact OMSG for help.",
    fr: "La connexion par courriel n’est pas disponible actuellement. Contactez OMSG pour obtenir de l’aide.",
  },
  server: {
    en: "The sign-in service is temporarily unavailable. Try again later or contact OMSG if the problem continues.",
    fr: "Le service de connexion est temporairement indisponible. Réessayez plus tard ou contactez OMSG si le problème persiste.",
  },
  other: {
    en: "We could not send the sign-in email. Try again or contact OMSG if the problem continues.",
    fr: "Le courriel de connexion n’a pas pu être envoyé. Réessayez ou contactez OMSG si le problème persiste.",
  },
};

export function professionalSignInErrorMessage(failure: unknown, language: "en" | "fr") {
  return MESSAGES[failureKind(failure)][language];
}
