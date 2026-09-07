import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })

const enc = new TextEncoder()

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function extensionFor(file: File) {
  const name = file.name.toLowerCase()
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (file.type === "application/msword" || name.endsWith(".doc")) return "doc"
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) return "docx"
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405)

  try {
    const form = await req.formData()
    const email = String(form.get("email") || "").trim().toLowerCase()
    const token = String(form.get("token") || "")
    const applicationId = String(form.get("application_id") || "").trim()
    const file = form.get("file")

    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ ok: false, error: "Invalid email" }, 400)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
      return json({ ok: false, error: "Invalid application id" }, 400)
    }
    if (!token) return json({ ok: false, error: "Missing verification token" }, 400)
    if (!(file instanceof File)) return json({ ok: false, error: "Missing resume file" }, 400)

    const extension = extensionFor(file)
    if (!extension) return json({ ok: false, error: "Unsupported file type" }, 400)
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return json({ ok: false, error: "Resume must be 5 MB or smaller" }, 400)
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    )

    const { data: application, error: applicationError } = await admin
      .from("career_applications")
      .select("id,email")
      .eq("id", applicationId)
      .eq("email", email)
      .maybeSingle()

    if (applicationError) throw applicationError
    if (!application) return json({ ok: false, error: "Application not found" }, 404)

    const { data: verification, error: verificationError } = await admin
      .from("email_verifications")
      .select("verification_token_hash,token_expires_at,verified_at,consumed_at")
      .eq("email", email)
      .eq("purpose", "career")
      .not("verified_at", "is", null)
      .not("consumed_at", "is", null)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (verificationError) throw verificationError
    if (!verification?.verification_token_hash || !verification?.token_expires_at) {
      return json({ ok: false, error: "Email verification not found" }, 403)
    }

    if (new Date(verification.token_expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: "Verification expired" }, 403)
    }

    const tokenHash = await sha256(token)
    if (tokenHash !== verification.verification_token_hash) {
      return json({ ok: false, error: "Invalid verification token" }, 403)
    }

    const bucket = admin.storage.from("career-resumes")
    const folder = `applications/${applicationId}`

    const { data: existing } = await bucket.list(folder, { limit: 20 })
    if (existing?.length) {
      await bucket.remove(existing.map((item) => `${folder}/${item.name}`))
    }

    const path = `${folder}/resume.${extension}`
    const { error: uploadError } = await bucket.upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
    })
    if (uploadError) throw uploadError

    const { error: updateError } = await admin
      .from("career_applications")
      .update({
        resume_file_name: file.name,
        resume_storage_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("email", email)

    if (updateError) throw updateError

    return json({ ok: true, path, file_name: file.name })
  } catch (e) {
    console.error(e)
    return json(
      { ok: false, error: e instanceof Error ? e.message : "Resume upload failed" },
      400,
    )
  }
})
