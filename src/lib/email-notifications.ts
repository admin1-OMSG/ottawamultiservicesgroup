import { supabase } from "@/lib/supabase"

export type CrmEmailEvent =
  | { type: "quote_requested"; requestId: string }
  | { type: "estimate_accepted"; estimateId: string }
  | { type: "estimate_ready"; estimateId: string }
  | { type: "appointment_proposed"; jobId: string }
  | { type: "booking_confirmed"; bookingId: string }
  | { type: "invoice_ready"; invoiceId: string }

export async function sendCrmEmail(event: CrmEmailEvent) {
  const { data, error } = await supabase.functions.invoke("send-crm-email", {
    body: event,
  })

  if (error) {
    console.error("CRM email notification failed:", error)
    return { ok: false, error: error.message }
  }

  if (!data?.ok) {
    console.error("CRM email notification rejected:", data)
    return { ok: false, error: data?.error ?? "Notification non envoyée." }
  }

  return { ok: true as const }
}
