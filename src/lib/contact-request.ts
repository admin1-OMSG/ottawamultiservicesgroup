/** Contact messages share verified CRM intake, without creating a quote or booking. */
export type ContactInput = { name: string; email: string; phone: string; message: string };
export type ContactLocale = "en" | "fr";

export function contactRequestArgs(
  input: ContactInput,
  token: string,
  id: string,
  language: ContactLocale,
) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const message = input.message.trim();
  if (
    !name ||
    name.length > 100 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254 ||
    phone.length > 40 ||
    !message ||
    message.length > 3000
  ) {
    throw new Error("INVALID_CONTACT_FIELDS");
  }
  if (!token) throw new Error("EMAIL_NOT_VERIFIED");
  const [firstName, ...lastName] = name.split(/\s+/);
  return {
    p_email: email,
    p_token: token,
    p_payload: {
      id,
      first_name: firstName,
      last_name: lastName.join(" ") || null,
      phone: phone || null,
      address_line: null,
      // General messages do not identify a service location or tax jurisdiction.
      province: "Not provided",
      service_name: language === "fr" ? "Message de contact" : "Contact message",
      description: message,
      preferred_language: language,
      questionnaire_answers: {
        requestType: "contact_message",
        source: "contact_page",
        preferredLanguage: language,
        Message: message,
        "Request type":
          language === "fr"
            ? "Message général — aucun devis ni réservation"
            : "General message — no quote or booking",
        "Service address":
          language === "fr" ? "Non demandée pour ce message" : "Not requested for this message",
        "Marketing consent": "Not requested",
      },
    },
  };
}

type ContactRpc = (
  name: "submit_verified_quote_request",
  args: ReturnType<typeof contactRequestArgs>,
) => PromiseLike<{ data: unknown; error: unknown }>;

export async function saveContactRequest(
  input: ContactInput,
  token: string,
  id: string,
  language: ContactLocale,
  rpc: ContactRpc,
): Promise<string> {
  const { data, error } = await rpc(
    "submit_verified_quote_request",
    contactRequestArgs(input, token, id, language),
  );
  if (error) throw error;
  // An HTTP success alone is insufficient: the existing RPC returns the saved UUID.
  if (data !== id) throw new Error("CONTACT_SAVE_NOT_CONFIRMED");
  return id;
}
