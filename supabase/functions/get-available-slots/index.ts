import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const TZ = "America/Toronto"

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

function localDateTimeToUtc(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(guess)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second))
  return new Date(guess.getTime() - (represented - guess.getTime()))
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const authorization = req.headers.get("Authorization") ?? ""
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401)

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: userData } = await userClient.auth.getUser()
    if (!userData.user) return json({ error: "Invalid session" }, 401)

    const body = await req.json()
    const estimateId = String(body?.estimateId ?? "")
    const date = String(body?.date ?? "")
    if (!estimateId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Estimate and date are required" }, 400)

    const { data: account } = await admin.from("customer_accounts").select("customer_id").eq("auth_user_id", userData.user.id).maybeSingle()
    if (!account) return json({ error: "Customer account not linked" }, 403)
    const { data: estimate } = await admin.from("estimates").select("id,status,estimated_duration_minutes").eq("id", estimateId).eq("customer_id", account.customer_id).maybeSingle()
    if (!estimate || !["sent", "viewed", "pending_review", "accepted", "converted_to_job"].includes(estimate.status)) return json({ error: "Estimate is not available for scheduling" }, 403)
    const duration = Number(estimate.estimated_duration_minutes || 0)
    if (!duration) return json({ error: "Estimated duration is missing" }, 409)

    const midday = localDateTimeToUtc(date, "12:00")
    const weekday = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(midday) && ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(midday)))
    const { data: hours } = await admin.from("business_hours").select("is_open,opens_at,closes_at,slot_interval_minutes").eq("day_of_week", weekday).maybeSingle()
    if (!hours?.is_open) return json({ slots: [] })

    const dayStart = localDateTimeToUtc(date, "00:00")
    const nextDate = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000)
    const nextDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit" }).format(nextDate)
    const dayEnd = localDateTimeToUtc(nextDateStr, "00:00")

    const [jobs, blocks, bookings] = await Promise.all([
      admin.from("jobs").select("estimate_id,scheduled_start,scheduled_end").neq("status", "cancelled").neq("estimate_id", estimateId).lt("scheduled_start", dayEnd.toISOString()).gt("scheduled_end", dayStart.toISOString()),
      admin.from("schedule_blocks").select("starts_at,ends_at").lt("starts_at", dayEnd.toISOString()).gt("ends_at", dayStart.toISOString()),
      admin.from("estimate_bookings").select("estimate_id,starts_at,ends_at").eq("status", "reserved").neq("estimate_id", estimateId).lt("starts_at", dayEnd.toISOString()).gt("ends_at", dayStart.toISOString()),
    ])
    const busy = [...(jobs.data ?? []).map((x) => [x.scheduled_start, x.scheduled_end]), ...(blocks.data ?? []).map((x) => [x.starts_at, x.ends_at]), ...(bookings.data ?? []).map((x) => [x.starts_at, x.ends_at])]
      .filter((x) => x[0] && x[1]).map(([a,b]) => [new Date(a as string).getTime(), new Date(b as string).getTime()])

    const opens = localDateTimeToUtc(date, String(hours.opens_at).slice(0,5)).getTime()
    const closes = localDateTimeToUtc(date, String(hours.closes_at).slice(0,5)).getTime()
    const interval = Number(hours.slot_interval_minutes || 30) * 60_000
    const durationMs = duration * 60_000
    const now = Date.now() + 30 * 60_000
    const slots: { startsAt: string; endsAt: string; label: string }[] = []
    for (let start = opens; start + durationMs <= closes; start += interval) {
      const end = start + durationMs
      if (start < now) continue
      if (busy.some(([bStart,bEnd]) => start < bEnd && end > bStart)) continue
      const label = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour:"numeric", minute:"2-digit", hour12:true }).format(new Date(start))
      slots.push({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), label })
    }
    return json({ slots })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500)
  }
})
