import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, RefreshCw, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireActiveAdmin } from "@/features/admin/requireAdmin";
import { formatCad } from "@/features/admin/formatters";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/marketing")({
  component: Page,
});

type Campaign = {
  id: string;
  name: string;
  status: string;
  locations: string[];
  external_campaign_id: string | null;
};

type Metric = {
  campaign_id: string;
  spend: number;
  conversations: number;
};

type Lead = {
  campaign_id: string | null;
  stage: string;
  converted_revenue: number;
};

type Breakdown = {
  campaign_id: string;
  breakdown_type: "age" | "region" | "country";
  breakdown_value: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversations: number;
  leads: number;
};

type CityPerf = {
  city: string;
  province: string;
  leads: number;
  quotes: number;
  customers: number;
  revenue: number;
};

type BreakdownSummary = {
  value: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversations: number;
  leads: number;
  costPerLead: number | null;
};

function Page() {
  const nav = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [cities, setCities] = useState<CityPerf[]>([]);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      if (!(await requireActiveAdmin())) {
        await nav({ to: "/admin/login" });
        return;
      }

      const [c, m, l, b, city] = await Promise.all([
        supabase
          .from("marketing_campaigns")
          .select("id,name,status,locations,external_campaign_id")
          .order("start_date", { ascending: false }),
        supabase
          .from("marketing_campaign_daily_metrics")
          .select("campaign_id,spend,conversations"),
        supabase
          .from("marketing_leads")
          .select("campaign_id,stage,converted_revenue"),
        supabase
          .from("marketing_campaign_breakdown_metrics")
          .select(
            "campaign_id,breakdown_type,breakdown_value,spend,impressions,reach,clicks,conversations,leads",
          ),
        supabase
          .from("marketing_city_performance")
          .select("city,province,leads,quotes,customers,revenue"),
      ]);

      if (c.error) throw c.error;
      if (m.error) throw m.error;
      if (l.error) throw l.error;
      if (b.error) throw b.error;
      if (city.error) throw city.error;

      setCampaigns((c.data || []) as Campaign[]);
      setMetrics((m.data || []) as Metric[]);
      setLeads((l.data || []) as Lead[]);
      setBreakdowns((b.data || []) as Breakdown[]);
      setCities((city.data || []) as CityPerf[]);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to load marketing data");
    } finally {
      setLoading(false);
    }
  }

  async function syncMetaAds() {
    setSyncing(true);
    setErr("");
    setSuccess("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No active admin session");
      }

      const { data, error } = await supabase.functions.invoke("sync-meta-ads", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const warningText =
        Array.isArray(data?.warnings) && data.warnings.length
          ? ` Warning: ${data.warnings.join(" | ")}`
          : "";

      setSuccess(
        `Meta Ads synchronized successfully (${data?.rows ?? 0} row${
          data?.rows === 1 ? "" : "s"
        }).${warningText}`,
      );

      await load();
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Unable to synchronize Meta Ads",
      );
    } finally {
      setSyncing(false);
    }
  }

  const rows = useMemo(
    () =>
      campaigns.map((c) => {
        const m = metrics.filter((x) => x.campaign_id === c.id);
        const l = leads.filter((x) => x.campaign_id === c.id);
        const spend = m.reduce((a, x) => a + Number(x.spend), 0);
        const messages = m.reduce(
          (a, x) => a + Number(x.conversations),
          0,
        );
        const clients = l.filter((x) => x.stage === "converted").length;
        const revenue = l.reduce(
          (a, x) => a + Number(x.converted_revenue),
          0,
        );

        return {
          ...c,
          spend,
          messages,
          leads: l.length,
          quotes: l.filter((x) => ["quoted", "converted"].includes(x.stage))
            .length,
          clients,
          revenue,
          cac: clients ? spend / clients : 0,
          roas: spend ? revenue / spend : 0,
        };
      }),
    [campaigns, metrics, leads],
  );

  const summarize = (type: "age" | "region"): BreakdownSummary[] => {
    const map = new Map<string, BreakdownSummary>();

    for (const x of breakdowns.filter((b) => b.breakdown_type === type)) {
      const current = map.get(x.breakdown_value) || {
        value: x.breakdown_value,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversations: 0,
        leads: 0,
        costPerLead: null,
      };

      current.spend += Number(x.spend || 0);
      current.impressions += Number(x.impressions || 0);
      current.reach += Number(x.reach || 0);
      current.clicks += Number(x.clicks || 0);
      current.conversations += Number(x.conversations || 0);
      current.leads += Number(x.leads || 0);
      map.set(x.breakdown_value, current);
    }

    return Array.from(map.values())
      .map((x) => ({
        ...x,
        costPerLead: x.leads > 0 ? x.spend / x.leads : null,
      }))
      .sort(
        (a, b) =>
          b.leads - a.leads ||
          b.conversations - a.conversations ||
          b.clicks - a.clicks ||
          b.impressions - a.impressions,
      );
  };

  const ageRows = useMemo(() => summarize("age"), [breakdowns]);
  const regionRows = useMemo(() => summarize("region"), [breakdowns]);

  const mostViewedRegion = [...regionRows].sort(
    (a, b) => b.impressions - a.impressions,
  )[0];

  const mostViewedAge = [...ageRows].sort(
    (a, b) => b.impressions - a.impressions,
  )[0];

  const cityRows = useMemo(
    () =>
      [...cities].sort(
        (a, b) =>
          b.leads - a.leads ||
          b.customers - a.customers ||
          Number(b.revenue) - Number(a.revenue),
      ),
    [cities],
  );

  const bestLeadCity = [...cityRows].sort((a, b) => b.leads - a.leads)[0];
  const bestCustomerCity = [...cityRows].sort(
    (a, b) => b.customers - a.customers,
  )[0];
  const bestRevenueCity = [...cityRows].sort(
    (a, b) => Number(b.revenue) - Number(a.revenue),
  )[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Ads → leads → quotes → customers → revenue, with audience and city insights."
        action={
          <button
            onClick={() => void syncMetaAds()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Meta Ads"}
          </button>
        }
      />

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {err}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          Loading…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <K
              l="Ad spend"
              v={formatCad(rows.reduce((a, x) => a + x.spend, 0))}
            />
            <K
              l="Leads"
              v={String(rows.reduce((a, x) => a + x.leads, 0))}
            />
            <K
              l="Customers"
              v={String(rows.reduce((a, x) => a + x.clients, 0))}
            />
            <K
              l="Revenue"
              v={formatCad(rows.reduce((a, x) => a + x.revenue, 0))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <InsightCard
              icon={<MapPin className="h-5 w-5" />}
              title="Best city for leads"
              value={
                bestLeadCity
                  ? `${bestLeadCity.city} (${bestLeadCity.leads})`
                  : "No data yet"
              }
            />
            <InsightCard
              icon={<Users className="h-5 w-5" />}
              title="Best city for customers"
              value={
                bestCustomerCity
                  ? `${bestCustomerCity.city} (${bestCustomerCity.customers})`
                  : "No data yet"
              }
            />
            <InsightCard
              icon={<Trophy className="h-5 w-5" />}
              title="Highest revenue city"
              value={
                bestRevenueCity
                  ? `${bestRevenueCity.city} (${formatCad(
                      Number(bestRevenueCity.revenue),
                    )})`
                  : "No data yet"
              }
            />
          </div>

          <CityTable rows={cityRows} />

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightCard
              icon={<MapPin className="h-5 w-5" />}
              title="Most viewed region"
              value={
                mostViewedRegion
                  ? `${mostViewedRegion.value} (${mostViewedRegion.impressions} impressions)`
                  : "No data yet"
              }
            />
            <InsightCard
              icon={<Users className="h-5 w-5" />}
              title="Most viewed age group"
              value={
                mostViewedAge
                  ? `${mostViewedAge.value} (${mostViewedAge.impressions} impressions)`
                  : "No data yet"
              }
            />
          </div>

          <BreakdownTable title="Performance by location" rows={regionRows} />
          <BreakdownTable title="Performance by age" rows={ageRows} />

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  {[
                    "Campaign",
                    "Status",
                    "Spend",
                    "Messages",
                    "Leads",
                    "Quotes",
                    "Clients",
                    "Revenue",
                    "Cost/client",
                    "ROAS",
                  ].map((x) => (
                    <th className="p-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr className="border-t" key={r.id}>
                    <td className="p-3">
                      <b>{r.name}</b>
                    </td>
                    <td className="p-3 capitalize">{r.status}</td>
                    <td className="p-3">{formatCad(r.spend)}</td>
                    <td className="p-3">{r.messages}</td>
                    <td className="p-3">{r.leads}</td>
                    <td className="p-3">{r.quotes}</td>
                    <td className="p-3">{r.clients}</td>
                    <td className="p-3">{formatCad(r.revenue)}</td>
                    <td className="p-3">
                      {r.clients ? formatCad(r.cac) : "—"}
                    </td>
                    <td className="p-3">
                      {r.spend ? `${r.roas.toFixed(2)}×` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function K({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-slate-500">{l}</p>
      <p className="mt-2 text-2xl font-bold">{v}</p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-3 text-xl font-bold">{value}</p>
    </div>
  );
}

function CityTable({ rows }: { rows: CityPerf[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b bg-slate-50 px-5 py-4">
        <h2 className="font-semibold">Performance by city</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              {[
                "City",
                "Province",
                "Leads",
                "Quotes",
                "Customers",
                "Revenue",
              ].map((x) => (
                <th className="p-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr className="border-t" key={`${r.city}-${r.province}`}>
                  <td className="p-3 font-semibold">{r.city}</td>
                  <td className="p-3">{r.province}</td>
                  <td className="p-3">{r.leads}</td>
                  <td className="p-3">{r.quotes}</td>
                  <td className="p-3">{r.customers}</td>
                  <td className="p-3">{formatCad(Number(r.revenue))}</td>
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td colSpan={6} className="p-5 text-slate-500">
                  No city-level CRM data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b bg-slate-50 px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              {[
                "Segment",
                "Impressions",
                "Reach",
                "Clicks",
                "Messages",
                "Leads",
                "Spend",
                "Cost/lead",
              ].map((x) => (
                <th className="p-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr className="border-t" key={r.value}>
                  <td className="p-3 font-semibold">{r.value}</td>
                  <td className="p-3">{r.impressions}</td>
                  <td className="p-3">{r.reach}</td>
                  <td className="p-3">{r.clicks}</td>
                  <td className="p-3">{r.conversations}</td>
                  <td className="p-3">{r.leads}</td>
                  <td className="p-3">{formatCad(r.spend)}</td>
                  <td className="p-3">
                    {r.costPerLead === null
                      ? "—"
                      : formatCad(r.costPerLead)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td className="p-5 text-slate-500" colSpan={8}>
                  No breakdown data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
