import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers:{ ...cors, "Content-Type":"application/json" } })
const enc = new TextEncoder()
async function hash(value:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(value));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors})
 try{
  const {email,purpose,code}=await req.json(); const normalized=String(email||"").trim().toLowerCase()
  if(!/^\d{6}$/.test(String(code||""))) return json({ok:false,error:"Invalid code"},400)
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}})
  const {data:row}=await admin.from("email_verifications").select("id,code_hash,expires_at,attempts").eq("email",normalized).eq("purpose",purpose).is("verified_at",null).is("invalidated_at",null).order("created_at",{ascending:false}).limit(1).maybeSingle()
  if(!row || new Date(row.expires_at).getTime()<Date.now()) return json({ok:false,error:"Code expired"},400)
  if((row.attempts||0)>=5) return json({ok:false,error:"Too many attempts"},429)
  const secret=Deno.env.get("EMAIL_VERIFICATION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const candidate=await hash(`${normalized}|${purpose}|${code}|${secret}`)
  if(candidate!==row.code_hash){await admin.from("email_verifications").update({attempts:(row.attempts||0)+1}).eq("id",row.id);return json({ok:false,error:"Invalid code"},400)}
  const token=crypto.randomUUID()+crypto.randomUUID(); const tokenHash=await hash(token)
  const {error}=await admin.from("email_verifications").update({verified_at:new Date().toISOString(),verification_token_hash:tokenHash,token_expires_at:new Date(Date.now()+30*60*1000).toISOString()}).eq("id",row.id)
  if(error) throw error
  return json({ok:true,token})
 }catch(e){console.error(e);return json({ok:false,error:e instanceof Error?e.message:"Verification failed"},400)}
})
