import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function detectMessageType(message: any) {
  const attachment = message?.attachments?.[0]
  if (!attachment) return "text"
  const type = String(attachment.type || "").toLowerCase()
  if (["image", "video", "audio", "file", "sticker"].includes(type)) return type
  return "unknown"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase environment variables.")
    return json({ error: "Server configuration error." }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  if (req.method === "GET") {
    const url = new URL(req.url)
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (mode === "subscribe" && verifyToken && token === verifyToken) {
      return new Response(challenge ?? "", { status: 200 })
    }

    return new Response("Forbidden", { status: 403 })
  }

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405)

  try {
    const payload = await req.json()
    const objectType = String(payload?.object || "").toLowerCase()

    const platform =
      objectType === "instagram" ? "instagram" :
      objectType === "page" ? "facebook" :
      null

    if (!platform) return json({ ok: true, ignored: true })

    const entries = Array.isArray(payload?.entry) ? payload.entry : []

    for (const entry of entries) {
      const events = Array.isArray(entry?.messaging) ? entry.messaging : []

      for (const event of events) {
        const message = event?.message
        if (!message?.mid) continue

        const isEcho = Boolean(message?.is_echo)
        const senderId = String(event?.sender?.id || "")
        const recipientId = String(event?.recipient?.id || "")
        if (!senderId || !recipientId) continue

        const externalUserId = isEcho ? recipientId : senderId
        const direction = isEcho ? "outbound" : "inbound"
        const sentAt =
          typeof event?.timestamp === "number"
            ? new Date(event.timestamp).toISOString()
            : new Date().toISOString()

        const messageType = detectMessageType(message)
        const attachment = message?.attachments?.[0]
        const attachmentUrl =
          attachment?.payload?.url ||
          attachment?.payload?.src ||
          null

        const { data: conversation, error: conversationError } = await supabase
          .from("social_conversations")
          .upsert(
            {
              platform,
              external_user_id: externalUserId,
              external_conversation_id: String(entry?.id || ""),
              status: "open",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "platform,external_user_id" },
          )
          .select("id")
          .single()

        if (conversationError) {
          console.error("Conversation upsert failed:", conversationError)
          continue
        }

        const { error: messageError } = await supabase
          .from("social_messages")
          .upsert(
            {
              conversation_id: conversation.id,
              platform,
              external_message_id: String(message.mid),
              direction,
              sender_external_id: senderId,
              recipient_external_id: recipientId,
              message_type: messageType,
              text_body: message?.text ? String(message.text) : null,
              attachment_url: attachmentUrl,
              attachment_name: null,
              raw_payload: event,
              sent_at: sentAt,
            },
            { onConflict: "platform,external_message_id" },
          )

        if (messageError) console.error("Message upsert failed:", messageError)
      }
    }

    return json({ ok: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      500,
    )
  }
})
