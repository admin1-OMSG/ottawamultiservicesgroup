type Env = (key: string) => string | undefined;
type Row = {
  id: string;
  lease: string;
  kind: "match" | "invitation" | "contact" | "message";
  email: string | null;
  phone: string | null;
  locale: string;
  request_id: string;
  contact_id: string | null;
  provider_name: string;
  recipient_is_provider: boolean;
};
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
// Single ASCII mailbox in dot-atom form. Exclude headers, display names and recipient lists.
function bareEmail(input: unknown): input is string {
  if (typeof input !== "string" || input.length > 254 || /[\s\x00-\x1f\x7f]/.test(input)) return false;
  const [local, domain, extra] = input.split("@");
  return extra === undefined && Boolean(local && local.length <= 64 && domain) &&
    /^[a-z0-9_!#$%&'*+\/=?^`{|}~-]+(?:\.[a-z0-9_!#$%&'*+\/=?^`{|}~-]+)*$/i.test(local) &&
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}
function crmSender(input: string) {
  if (bareEmail(input)) return input;
  const match = /^([\p{L}\p{N}][\p{L}\p{N}\p{M} '.&-]{0,79}) <([^<>]+)>$/u.exec(input);
  return match && match[0] === input && bareEmail(match[2]) ? input : "";
}
function keyPresent(input: string | undefined): input is string {
  return Boolean(input && !/[\s\x00-\x1f\x7f]/.test(input));
}
const e164 = /^\+[1-9]\d{7,14}$/;
const preview = "https://vdeeevxpwjvztsoonuxx.supabase.co";
const previewSite = "https://ottawamultiservicesgroup-git-codex-professional-onboarding-omsg.vercel.app";
const ok = (status = 204) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
const timeout = () => AbortSignal.timeout(8000);

function configuration(env: Env) {
  const origin = env("SUPABASE_URL")?.replace(/\/$/, "");
  const secret = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!origin || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(origin) || !secret) return null;
  const mode = env("MARKET_DISPATCH_ENV");
  const production = mode === "production" && origin !== preview &&
    origin === "https://" + env("MARKET_PRODUCTION_PROJECT_REF") + ".supabase.co";
  const recipients = env("MARKET_PREVIEW_RECIPIENTS");
  const isPreview = origin === preview && (mode === "preview" || (mode === undefined && recipients === undefined));
  const productionSite = env("MARKET_SITE_ORIGIN") || "";
  const site = isPreview ? previewSite : production &&
    /^https:\/\/(?:www\.)?(?:ottawamultiservicesgroup|canadamultiservicesgroup)\.com$/.test(productionSite)
    ? productionSite : "";
  const addresses = (recipients ?? "").toLowerCase().split(",").map(x=>x.trim());
  const validList = recipients && !/[\x00-\x1f\x7f]/.test(recipients) && addresses.every(x=>bareEmail(x) || e164.test(x));
  const allowed = new Set(validList ? addresses : []);
  const mailKey = env("MARKET_RESEND_API_KEY");
  const from = env("MARKET_MAIL_FROM");
  const sid = env("MARKET_TWILIO_ACCOUNT_SID") || "";
  const auth = env("MARKET_TWILIO_AUTH_TOKEN");
  const number = env("MARKET_TWILIO_FROM") || "";
  const mail = site && keyPresent(mailKey) && bareEmail(from) && !isPreview ? { key: mailKey, from } : null;
  const sms = site && /^AC[\da-f]{32}$/i.test(sid) && auth && e164.test(number) &&
    (!isPreview || (mode === "preview" && [...allowed].some(x => e164.test(x)))) ? { sid, auth, number } : null;
  return { origin, secret, site, mail, sms, allowed, isPreview, recipients, mailKey, from };
}
type Config = NonNullable<ReturnType<typeof configuration>>;

function message(row: Row, site: string) {
  const fr = row.locale === "fr";
  const subject = {
    match: fr ? "Nouvelle demande dans votre secteur" : "New request in your service area",
    invitation: fr ? "Un client vous invite à répondre" : "A client has invited you to respond",
    contact: fr ? "Un professionnel a répondu à votre demande" : "A professional responded to your request",
    message: fr ? "Nouveau message sur OMSG" : "New message on OMSG",
  }[row.kind];
  if (!subject || !uuid.test(row.request_id) || (row.contact_id && !uuid.test(row.contact_id))) return null;
  const url = new URL(row.recipient_is_provider ? "/pro-market" : "/marketplace", site);
  if (row.contact_id) url.searchParams.set("contact", row.contact_id);
  else url.searchParams.set(row.recipient_is_provider ? "lead" : "request", row.request_id);
  const name = String(row.provider_name || "").slice(0, 100).trim();
  const safeName = /^[\p{L}\p{M}\d .,&'’()-]+$/u.test(name) && !/\.[\p{L}]{2}/u.test(name);
  const headline = row.kind === "contact" && safeName
    ? fr ? name + " a répondu à votre demande." : name + " responded to your request."
    : subject + ".";
  return { subject: "OMSG — " + subject, text: "OMSG · " + headline + "\n" + url.href };
}

async function verifyTwilioSignature(url: string, fields: URLSearchParams, signature: string | null, token: string) {
  if (!signature || !/^[A-Za-z0-9+/]{27}=$/.test(signature)) return false;
  const keys = [...new Set(fields.keys())].sort();
  if (keys.some(k=>fields.getAll(k).length !== 1)) return false;
  const bytes = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", bytes.encode(token), { name:"HMAC", hash:"SHA-1" }, false, ["verify"]);
  const payload = url + keys.map(k => k + fields.get(k)).join("");
  return crypto.subtle.verify("HMAC", key, Uint8Array.from(atob(signature), c=>c.charCodeAt(0)), bytes.encode(payload));
}

async function smallBody(request: Request, max: number) {
  if (Number(request.headers.get("Content-Length")) > max) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const part = await reader.read();
    if (part.done) return result + decoder.decode();
    size += part.value.length;
    if (size > max) { await reader.cancel(); return null; }
    result += decoder.decode(part.value, {stream:true});
  }
}
type Rpc = (name: string, args: Record<string,unknown>) => Promise<unknown>;

// The branch-only CRM settings and optional recipient record are read only after a ticket has been consumed.
async function previewMail(cfg: Config, env: Env, rpc: Rpc) {
  let allowed = cfg.allowed;
  let databaseSender = "";
  let lookupFailed = false;
  if (cfg.recipients === undefined) {
    try {
      const settings = await rpc("market_preview_mail_settings", {}) as { recipient?: unknown; sender?: unknown } | null;
      if (bareEmail(settings?.recipient)) {
        allowed = new Set([settings.recipient.toLowerCase()]);
        if (bareEmail(settings.sender)) databaseSender = settings.sender;
      }
    } catch { lookupFailed = true; }
  }
  const key = cfg.mailKey ?? env("RESEND_API_KEY");
  const fallbackFrom = cfg.from === undefined && cfg.mailKey === undefined ? env("EMAIL_FROM") : undefined;
  const from = cfg.from !== undefined ? (bareEmail(cfg.from) ? cfg.from : "") :
    fallbackFrom !== undefined ? crmSender(fallbackFrom) : databaseSender;
  const keyOk = keyPresent(key);
  const recipientOk = [...allowed].some(bareEmail);
  return {
    config: { ...cfg, allowed, mail: keyOk && from && recipientOk ? { key, from } : null },
    readiness: { email_key_present: keyOk, email_sender_configured: Boolean(from), email_recipient_configured: recipientOk,
      preview_settings_lookup_failed: lookupFailed },
  };
}

async function deliver(row: Row, cfg: Config, rpc: Rpc, network: typeof fetch) {
  if (!uuid.test(row.id) || !uuid.test(row.lease)) return;
  const finish = (success: boolean) => rpc("market_finish_delivery",{p_id:row.id,p_lease:row.lease,p_ok:success});
  const msg = message(row, cfg.site);
  if (!msg) { await finish(false); return; }
  const emailTo = row.email?.trim().toLowerCase() || "";
  const rawPhone = row.phone?.trim() || "";
  // Supabase Auth can return a verified number with digits only.
  const phoneTo = /^\d+$/.test(rawPhone) ? "+" + rawPhone : rawPhone;
  const allowed = (to:string) => !cfg.isPreview || cfg.allowed.has(to);
  if (cfg.mail && bareEmail(emailTo) && allowed(emailTo)) {
    const res = await network("https://api.resend.com/emails",{
      method:"POST", redirect:"error", signal:timeout(), headers:{
        Authorization:"Bearer "+cfg.mail.key,"Content-Type":"application/json","Idempotency-Key":"market-notice/"+row.id,
      },body:JSON.stringify({from:cfg.mail.from,to:[emailTo],subject:msg.subject,text:msg.text}),
    });
    const data = res.ok ? await res.json() : null;
    await finish(res.ok && typeof data?.id === "string" && uuid.test(data.id));
    return;
  }
  if (!cfg.sms || !e164.test(phoneTo) || !allowed(phoneTo)) { await finish(false); return; }
  const attempt = crypto.randomUUID();
  if (await rpc("market_reserve_sms",{p_id:row.id,p_lease:row.lease,p_attempt:attempt}) !== true) {
    await finish(false);
    return;
  }
  const callback = cfg.origin+"/functions/v1/market-dispatch/sms-status?id="+row.id+"&attempt="+attempt;
  const requestBody = new URLSearchParams({To:phoneTo, From:cfg.sms.number, Body:msg.text, StatusCallback:callback});
  const res = await network("https://api.twilio.com/2010-04-01/Accounts/"+cfg.sms.sid+"/Messages.json",{
    method:"POST",redirect:"error",signal:timeout(),
    headers:{Authorization:"Basic "+btoa(cfg.sms.sid+":"+cfg.sms.auth),"Content-Type":"application/x-www-form-urlencoded"},
    body:requestBody,
  });
  const outcome = (state:string,sid:string|null) => rpc("market_sms_result",{p_id:row.id,p_attempt:attempt,p_state:state,p_sid:sid});
  if (res.status >= 400 && res.status < 500 && res.status !== 408) {
    await outcome("rejected",null); return;
  }
  if (!res.ok) return;
  const data = await res.json();
  if (typeof data?.sid !== "string" || !/^SM[\da-f]{32}$/i.test(data.sid)) return;
  await outcome(["failed","undelivered","canceled"].includes(data.status)?"failed":"accepted",data.sid);
}

export function createDispatcher(env: Env, network: typeof fetch = fetch) {
  const cfg = configuration(env);
  return async (req: Request) => {
    if (req.method !== "POST") return ok(405);
    const incoming = new URL(req.url);
    const isCallback = /^(?:\/functions\/v1)?\/market-dispatch\/sms-status$/.test(incoming.pathname);
    const isReadiness = /^(?:\/functions\/v1)?\/market-dispatch\/readiness$/.test(incoming.pathname);
    if (!isCallback && !isReadiness && !/^(?:\/functions\/v1)?\/market-dispatch\/?$/.test(incoming.pathname)) return ok(404);
    if (!cfg) return ok(503);
    const rpc: Rpc = async(name,args) => {
      const res = await network(cfg.origin+"/rest/v1/rpc/"+name,{
        method:"POST",redirect:"error",signal:timeout(),
        headers:{apikey:cfg.secret,Authorization:"Bearer "+cfg.secret,"Content-Type":"application/json"},body:JSON.stringify(args),
      });
      if (!res.ok) throw new Error("Marketplace database unavailable");
      return await res.json();
    };
    try {
      if (isCallback) {
        if (!cfg.sms || req.headers.get("Content-Type")?.split(";")[0] !== "application/x-www-form-urlencoded") return ok(403);
        const id = incoming.searchParams.get("id") || "", attempt = incoming.searchParams.get("attempt") || "";
        if (!uuid.test(id) || !uuid.test(attempt)) return ok(403);
        const raw = await smallBody(req,8192);
        if (raw === null) return ok(413);
        const fields = new URLSearchParams(raw);
        const canonical = cfg.origin+"/functions/v1/market-dispatch/sms-status"+incoming.search;
        if (!await verifyTwilioSignature(canonical,fields,req.headers.get("X-Twilio-Signature"),cfg.sms.auth) ||
          fields.get("AccountSid") !== cfg.sms.sid) return ok(403);
        const sid = fields.get("MessageSid");
        const status = fields.get("MessageStatus") || "";
        if (!sid || !/^SM[\da-f]{32}$/i.test(sid)) return ok(400);
        if (["accepted","queued","sending","sent","delivered","read","failed","undelivered","canceled"].includes(status)) {
          await rpc("market_sms_result",{p_id:id,p_attempt:attempt,p_state:["failed","undelivered","canceled"].includes(status)?"failed":"accepted",p_sid:sid});
        }
        return ok();
      }
      const token = req.headers.get("X-Market-Ticket") || "";
      if (!/^[0-9a-f]{64}$/.test(token) || await rpc("market_consume_dispatch_ticket",{p_token:token}) !== true) return ok(401);
      const previewSettings = cfg.isPreview ? await previewMail(cfg,env,rpc) : null;
      const delivery = previewSettings?.config ?? cfg;
      if (isReadiness) {
        return Response.json({ email_enabled: Boolean(delivery.mail), sms_enabled: Boolean(delivery.sms), ...previewSettings?.readiness }, {
          headers: { "Cache-Control": "no-store" },
        });
      }
      if (previewSettings?.readiness.preview_settings_lookup_failed) return ok(503);
      if (!delivery.mail && !delivery.sms) return ok();
      const rows = await rpc("market_claim_deliveries",{p_limit:6,p_email:!!delivery.mail,p_sms:!!delivery.sms});
      if (!Array.isArray(rows)) return ok(503);
      const results = await Promise.allSettled(rows.map(row => deliver(row,delivery,rpc,network)));
      return ok(results.some(r=>r.status==="rejected")?503:204);
    } catch { return ok(503); }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createDispatcher(key=>Deno.env.get(key)));
