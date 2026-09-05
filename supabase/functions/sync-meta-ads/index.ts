import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const out = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), {
    status: s,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

type MetaRow = {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  age?: string;
  region?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const u = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Manual browser sync OR scheduled cron sync.
    const suppliedCronSecret = req.headers.get("x-cron-secret") || "";
    const expectedCronSecret = Deno.env.get("META_SYNC_CRON_SECRET") || "";
    const isCron =
      expectedCronSecret.length > 0 &&
      suppliedCronSecret.length > 0 &&
      suppliedCronSecret === expectedCronSecret;

    if (!isCron) {
      const auth = req.headers.get("Authorization") || "";
      if (!auth) return out({ error: "Unauthorized" }, 401);

      const caller = createClient(u, anon, {
        global: { headers: { Authorization: auth } },
      });

      const {
        data: { user },
      } = await caller.auth.getUser();

      if (!user) return out({ error: "Unauthorized" }, 401);

      const { data: admin, error: adminError } = await caller
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!admin) return out({ error: "Admin required" }, 403);
    }

    const token = Deno.env.get("META_ACCESS_TOKEN");
    const account = Deno.env.get("META_AD_ACCOUNT_ID");

    if (!token || !account) {
      return out(
        { error: "Configure META_ACCESS_TOKEN and META_AD_ACCOUNT_ID" },
        503,
      );
    }

    const since = new Date(Date.now() - 30 * 864e5)
      .toISOString()
      .slice(0, 10);
    const until = new Date().toISOString().slice(0, 10);

    const db = createClient(u, key);
    const warnings: string[] = [];

    const countAction = (
      actions: MetaRow["actions"] = [],
      ...types: string[]
    ) =>
      (actions || [])
        .filter((z) => types.includes(z.action_type))
        .reduce((n, z) => n + Number(z.value || 0), 0);

    async function ensureCampaign(x: MetaRow) {
      // Preserve the CRM-friendly campaign name if the campaign already exists.
      const { data: existing, error: existingError } = await db
        .from("marketing_campaigns")
        .select("id")
        .eq("platform", "meta")
        .eq("external_campaign_id", x.campaign_id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        const { error: updateError } = await db
          .from("marketing_campaigns")
          .update({ status: "active" })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        return existing.id as string;
      }

      const { data: inserted, error: insertError } = await db
        .from("marketing_campaigns")
        .insert({
          platform: "meta",
          external_campaign_id: x.campaign_id,
          name: x.campaign_name,
          status: "active",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      return inserted.id as string;
    }

    async function fetchInsights(breakdown?: "age" | "region") {
      const params = new URLSearchParams({
        access_token: token!,
        level: "campaign",
        time_increment: "1",
        fields:
          "campaign_id,campaign_name,spend,impressions,reach,clicks,actions",
        time_range: JSON.stringify({ since, until }),
        limit: "500",
      });

      if (breakdown) params.set("breakdowns", breakdown);

      const response = await fetch(
        `https://graph.facebook.com/v24.0/act_${account!.replace(/^act_/, "")}/insights?${params}`,
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          `${breakdown || "campaign"} insights: ${JSON.stringify(body)}`,
        );
      }

      return (body.data || []) as MetaRow[];
    }

    // 1) Standard campaign totals.
    const baseRows = await fetchInsights();

    for (const x of baseRows) {
      const campaignId = await ensureCampaign(x);

      const { error: metricError } = await db
        .from("marketing_campaign_daily_metrics")
        .upsert(
          {
            campaign_id: campaignId,
            metric_date: x.date_start,
            spend: Number(x.spend || 0),
            impressions: Number(x.impressions || 0),
            reach: Number(x.reach || 0),
            clicks: Number(x.clicks || 0),
            conversations: countAction(
              x.actions,
              "onsite_conversion.messaging_conversation_started_7d",
              "messaging_conversation_started",
            ),
            leads: countAction(x.actions, "lead"),
            raw: x,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "campaign_id,metric_date" },
        );

      if (metricError) throw metricError;
    }

    // 2) Demographic + geographic breakdowns.
    // Requested separately because Meta restricts some breakdown combinations.
    for (const breakdown of ["age", "region"] as const) {
      try {
        const rows = await fetchInsights(breakdown);

        for (const x of rows) {
          const campaignId = await ensureCampaign(x);
          const value = String(x[breakdown] || "Unknown");

          const { error: breakdownError } = await db
            .from("marketing_campaign_breakdown_metrics")
            .upsert(
              {
                campaign_id: campaignId,
                metric_date: x.date_start,
                breakdown_type: breakdown,
                breakdown_value: value,
                spend: Number(x.spend || 0),
                impressions: Number(x.impressions || 0),
                reach: Number(x.reach || 0),
                clicks: Number(x.clicks || 0),
                conversations: countAction(
                  x.actions,
                  "onsite_conversion.messaging_conversation_started_7d",
                  "messaging_conversation_started",
                ),
                leads: countAction(x.actions, "lead"),
                raw: x,
                synced_at: new Date().toISOString(),
              },
              {
                onConflict:
                  "campaign_id,metric_date,breakdown_type,breakdown_value",
              },
            );

          if (breakdownError) throw breakdownError;
        }
      } catch (e) {
        warnings.push(
          `${breakdown}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return out({
      ok: true,
      mode: isCron ? "cron" : "admin",
      rows: baseRows.length,
      breakdowns: ["age", "region"],
      warnings,
      since,
      until,
    });
  } catch (e) {
    return out(
      { error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
