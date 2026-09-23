import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, RefreshCw, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireActiveAdmin } from "@/features/admin/requireAdmin";
import { formatCad } from "@/features/admin/formatters";
import { supabase } from "@/lib/supabase";
import {
  buildCampaignDashboard,
  fetchMarketingPages,
  type Campaign,
  type Metric,
  type Lead,
  type Breakdown,
  type CityPerf,
  type BreakdownSummary,
} from "@/features/admin/marketing-campaigns";

export const Route = createFileRoute("/admin/marketing")({
  component: Page,
});

type CampaignSnapshot = {
  campaignId: string;
  metrics: Metric[];
  leads: Lead[];
  breakdowns: Breakdown[];
  error: string;
};

function Page() {
  const nav = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [snapshot, setSnapshot] = useState<CampaignSnapshot | null>(null);
  const [campaignError, setCampaignError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingCampaigns(true);
    setCampaignError("");

    async function loadCampaigns() {
      try {
        if (!(await requireActiveAdmin())) {
          if (!cancelled) await nav({ to: "/admin/login" });
          return;
        }
        if (cancelled) return;

        const nextCampaigns = await fetchMarketingPages<Campaign>((from, to) =>
          supabase
            .from("marketing_campaigns")
            .select("id,name,status,locations,external_campaign_id")
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to),
        );
        if (cancelled) return;

        setCampaigns(nextCampaigns);
        // Keep the user's choice when syncing, including a change made mid-sync.
        setSelectedCampaignId((current) =>
          nextCampaigns.some((campaign) => campaign.id === current)
            ? current
            : (nextCampaigns[0]?.id ?? ""),
        );
      } catch (error) {
        if (!cancelled) {
          setCampaignError(error instanceof Error ? error.message : "Unable to load campaigns");
        }
      } finally {
        if (!cancelled) setLoadingCampaigns(false);
      }
    }

    void loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, [nav, refreshVersion]);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    if (!selectedCampaignId) return;

    async function loadCampaignData() {
      try {
        // Filter before pagination; other campaigns cannot consume the row limit.
        const [metrics, leads, breakdowns] = await Promise.all([
          fetchMarketingPages<Metric>((from, to) =>
            supabase
              .from("marketing_campaign_daily_metrics")
              .select("campaign_id,spend,conversations,impressions,clicks,leads")
              .eq("campaign_id", selectedCampaignId)
              .order("id")
              .range(from, to),
          ),
          fetchMarketingPages<Lead>((from, to) =>
            supabase
              .from("marketing_leads")
              .select("campaign_id,stage,converted_revenue,city,province")
              .eq("campaign_id", selectedCampaignId)
              .order("id")
              .range(from, to),
          ),
          fetchMarketingPages<Breakdown>((from, to) =>
            supabase
              .from("marketing_campaign_breakdown_metrics")
              .select(
                "campaign_id,breakdown_type,breakdown_value,spend,impressions,reach,clicks,conversations,leads",
              )
              .eq("campaign_id", selectedCampaignId)
              .order("id")
              .range(from, to),
          ),
        ]);
        if (!cancelled) {
          setSnapshot({ campaignId: selectedCampaignId, metrics, leads, breakdowns, error: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshot({
            campaignId: selectedCampaignId,
            metrics: [],
            leads: [],
            breakdowns: [],
            error: error instanceof Error ? error.message : "Unable to load campaign statistics",
          });
        }
      }
    }

    void loadCampaignData();
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId, refreshVersion]);

  async function syncMetaAds() {
    setSyncing(true);
    setSyncError("");
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
      if (data?.error) throw new Error(data.error);

      const warningText =
        Array.isArray(data?.warnings) && data.warnings.length
          ? ` Warning: ${data.warnings.join(" | ")}`
          : "";

      setSuccess(
        `Meta Ads synchronized successfully (${data?.rows ?? 0} row${
          data?.rows === 1 ? "" : "s"
        }).${warningText}`,
      );

      setRefreshVersion((version) => version + 1);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Unable to synchronize Meta Ads");
    } finally {
      setSyncing(false);
    }
  }

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  // Never show the previous campaign under the new campaign's name.
  const currentSnapshot = snapshot?.campaignId === selectedCampaignId ? snapshot : null;
  const { summary, cityRows, regionRows, ageRows } = useMemo(
    () =>
      buildCampaignDashboard(
        selectedCampaignId,
        currentSnapshot?.metrics ?? [],
        currentSnapshot?.leads ?? [],
        currentSnapshot?.breakdowns ?? [],
      ),
    [selectedCampaignId, currentSnapshot],
  );
  const rows = selectedCampaign ? [{ ...selectedCampaign, ...summary }] : [];
  const err = campaignError || syncError || currentSnapshot?.error || "";
  const loading = loadingCampaigns || (!!selectedCampaign && !currentSnapshot);
  const mostViewedRegion = [...regionRows].sort((a, b) => b.impressions - a.impressions)[0];
  const mostViewedAge = [...ageRows].sort((a, b) => b.impressions - a.impressions)[0];

  const bestLeadCity = [...cityRows].sort((a, b) => b.leads - a.leads)[0];
  const bestCustomerCity = [...cityRows].sort((a, b) => b.customers - a.customers)[0];
  const bestRevenueCity = [...cityRows].sort((a, b) => Number(b.revenue) - Number(a.revenue))[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Ads → leads → quotes → customers → revenue, with audience and city insights."
        action={
          <button
            onClick={() => void syncMetaAds()}
            disabled={syncing || loadingCampaigns}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Meta Ads"}
          </button>
        }
      />

      <div className="rounded-xl border bg-white p-5">
        <label htmlFor="marketing-campaign" className="mb-2 block text-sm font-semibold">
          Campaign
        </label>
        <select
          id="marketing-campaign"
          value={selectedCampaignId}
          onChange={(event) => setSelectedCampaignId(event.target.value)}
          disabled={loadingCampaigns || !campaigns.length}
          aria-describedby="marketing-campaign-help"
          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
        >
          {!campaigns.length && (
            <option value="">
              {loadingCampaigns ? "Loading campaigns…" : "No campaigns available"}
            </option>
          )}
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
        <p id="marketing-campaign-help" className="mt-2 text-sm text-slate-600">
          All figures below apply only to the selected campaign, across its imported history.
        </p>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{err}</div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center">Loading…</div>
      ) : campaignError || currentSnapshot?.error ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">
          Campaign statistics are unavailable. Reload the page to try again.
        </div>
      ) : !selectedCampaign ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">
          No campaign data yet. Use Sync Meta Ads once your campaign has started delivering.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <K l="Impressions" v={String(summary.impressions)} />
            <K l="Clicks" v={String(summary.clicks)} />
            <K l="Meta leads" v={String(summary.metaLeads)} />
            <K l="Messages" v={String(summary.messages)} />
            <K l="Ad spend" v={formatCad(rows.reduce((a, x) => a + x.spend, 0))} />
            <K l="CRM leads" v={String(rows.reduce((a, x) => a + x.leads, 0))} />
            <K l="Converted CRM leads" v={String(rows.reduce((a, x) => a + x.clients, 0))} />
            <K l="Revenue" v={formatCad(rows.reduce((a, x) => a + x.revenue, 0))} />
          </div>

          <p className="text-sm text-slate-600">
            Meta leads are reported by Meta. CRM leads, conversions, city statistics and revenue
            include only CRM records linked to this campaign. Unassigned requests are excluded.
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <InsightCard
              icon={<MapPin className="h-5 w-5" />}
              title="Best city for leads"
              value={bestLeadCity ? `${bestLeadCity.city} (${bestLeadCity.leads})` : "No data yet"}
            />
            <InsightCard
              icon={<Users className="h-5 w-5" />}
              title="Best city for conversions"
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
                  ? `${bestRevenueCity.city} (${formatCad(Number(bestRevenueCity.revenue))})`
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
                    "Impressions",
                    "Clicks",
                    "Meta leads",
                    "Messages",
                    "CRM leads",
                    "Quotes",
                    "Converted leads",
                    "Revenue",
                    "Cost/conversion",
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
                    <td className="p-3">{r.impressions}</td>
                    <td className="p-3">{r.clicks}</td>
                    <td className="p-3">{r.metaLeads}</td>
                    <td className="p-3">{r.messages}</td>
                    <td className="p-3">{r.leads}</td>
                    <td className="p-3">{r.quotes}</td>
                    <td className="p-3">{r.clients}</td>
                    <td className="p-3">{formatCad(r.revenue)}</td>
                    <td className="p-3">{r.cac === null ? "—" : formatCad(r.cac)}</td>
                    <td className="p-3">{r.roas === null ? "—" : `${r.roas.toFixed(2)}×`}</td>
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
              {["City", "Province", "Leads", "Quotes", "Converted leads", "Revenue"].map((x) => (
                <th className="p-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr className="border-t" key={JSON.stringify([r.city, r.province])}>
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

function BreakdownTable({ title, rows }: { title: string; rows: BreakdownSummary[] }) {
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
                "Daily reach (sum)",
                "Clicks",
                "Messages",
                "Meta leads",
                "Spend",
                "Cost/Meta lead",
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
                  <td className="p-3">{r.costPerLead === null ? "—" : formatCad(r.costPerLead)}</td>
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
