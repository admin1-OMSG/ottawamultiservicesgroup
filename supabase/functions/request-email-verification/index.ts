import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })
const enc = new TextEncoder()
async function hash(value: string) { const d = await crypto.subtle.digest("SHA-256", enc.encode(value)); return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2,"0")).join("") }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { email, purpose, language = "en" } = await req.json()
    const normalized = String(email || "").trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return json({ ok:false, error:"Invalid email" }, 400)
    if (!["quote","partner_service_provider","partner_subcontracting"].includes(purpose)) return json({ ok:false, error:"Invalid purpose" }, 400)

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth:{ persistSession:false } })
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count } = await admin.from("email_verifications").select("id", { count:"exact", head:true }).eq("email", normalized).gte("created_at", since)
    if ((count || 0) >= 3) return json({ ok:false, error:"Too many verification requests. Please wait 15 minutes." }, 429)

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6,"0")
    const secret = Deno.env.get("EMAIL_VERIFICATION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const codeHash = await hash(`${normalized}|${purpose}|${code}|${secret}`)
    await admin.from("email_verifications").update({ invalidated_at:new Date().toISOString() }).eq("email", normalized).eq("purpose", purpose).is("verified_at", null).is("invalidated_at", null)
    const { error: insertError } = await admin.from("email_verifications").insert({ email:normalized, purpose, code_hash:codeHash, expires_at:new Date(Date.now()+10*60*1000).toISOString() })
    if (insertError) throw insertError

    const resendKey = Deno.env.get("RESEND_API_KEY")!
    const from = Deno.env.get("EMAIL_FROM") || "Ottawa Multiservices <notifications@ottawamultiservicesgroup.com>"
    const fr = language === "fr"
    const subject = fr ? "Votre code de vérification Ottawa Multiservices" : "Your Ottawa Multiservices verification code"
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>${fr ? "Vérifiez votre adresse courriel" : "Verify your email address"}</h2><p>${fr ? "Utilisez ce code pour continuer votre demande :" : "Use this code to continue your submission:"}</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px;background:#ecfeff;border-radius:12px;text-align:center">${code}</div><p>${fr ? "Ce code expire dans 10 minutes. Si vous n’avez pas fait cette demande, ignorez ce message." : "This code expires in 10 minutes. If you did not make this request, ignore this email."}</p></div>`
    const r = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${resendKey}`, "Content-Type":"application/json" }, body:JSON.stringify({ from, to:[normalized], subject, html }) })
    if (!r.ok) throw new Error(`Email provider error: ${r.status}`)
    return json({ ok:true })
  } catch (e) { console.error(e); return json({ ok:false, error:e instanceof Error ? e.message : "Verification email failed" }, 400) }
})
