export type Campaign = {
  id: string;
  name: string;
  status: string;
  locations: string[];
  external_campaign_id: string | null;
};

export type Metric = {
  campaign_id: string;
  spend: number;
  conversations: number;
  impressions: number;
  clicks: number;
  leads: number;
};

export type Lead = {
  campaign_id: string | null;
  stage: string;
  converted_revenue: number;
  city: string | null;
  province: string | null;
};

export type Breakdown = {
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

export type CityPerf = {
  city: string;
  province: string;
  leads: number;
  quotes: number;
  customers: number;
  revenue: number;
};

export type BreakdownSummary = {
  value: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversations: number;
  leads: number;
  costPerLead: number | null;
};

function numeric(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Use one campaign scope for every chart, including CRM city statistics. */
export function buildCampaignDashboard(
  campaignId: string,
  metrics: Metric[],
  leads: Lead[],
  breakdowns: Breakdown[],
) {
  // Do not infer attribution from a location, a service or a recent campaign.
  const campaignMetrics = campaignId ? metrics.filter((row) => row.campaign_id === campaignId) : [];
  const campaignLeads = campaignId ? leads.filter((row) => row.campaign_id === campaignId) : [];
  const campaignBreakdowns = campaignId
    ? breakdowns.filter((row) => row.campaign_id === campaignId)
    : [];

  const totals = campaignMetrics.reduce(
    (sum, row) => ({
      spend: sum.spend + numeric(row.spend),
      messages: sum.messages + numeric(row.conversations),
      impressions: sum.impressions + numeric(row.impressions),
      clicks: sum.clicks + numeric(row.clicks),
      metaLeads: sum.metaLeads + numeric(row.leads),
    }),
    { spend: 0, messages: 0, impressions: 0, clicks: 0, metaLeads: 0 },
  );
  const spend = money(totals.spend);
  const clients = campaignLeads.filter((row) => row.stage === "converted").length;
  const quotes = campaignLeads.filter((row) => ["quoted", "converted"].includes(row.stage)).length;
  const revenue = money(
    campaignLeads.reduce((sum, row) => sum + numeric(row.converted_revenue), 0),
  );

  const cities = new Map<string, CityPerf>();
  for (const lead of campaignLeads) {
    const city = lead.city?.trim() || "Unknown";
    const province = lead.province?.trim() || "Unknown";
    const key = JSON.stringify([city, province]);
    const row = cities.get(key) ?? {
      city,
      province,
      leads: 0,
      quotes: 0,
      customers: 0,
      revenue: 0,
    };
    row.leads++;
    if (["quoted", "converted"].includes(lead.stage)) row.quotes++;
    if (lead.stage === "converted") row.customers++;
    // Match marketing_city_performance: sum the stored revenue on every row.
    row.revenue += numeric(lead.converted_revenue);
    cities.set(key, row);
  }
  const cityRows = [...cities.values()]
    .map((row) => ({ ...row, revenue: money(row.revenue) }))
    .sort((a, b) => b.leads - a.leads || b.customers - a.customers || b.revenue - a.revenue);

  function summarize(type: "age" | "region"): BreakdownSummary[] {
    const groups = new Map<string, BreakdownSummary>();
    for (const item of campaignBreakdowns) {
      if (item.breakdown_type !== type) continue;
      const row = groups.get(item.breakdown_value) ?? {
        value: item.breakdown_value,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversations: 0,
        leads: 0,
        costPerLead: null,
      };
      row.spend += numeric(item.spend);
      row.impressions += numeric(item.impressions);
      // This is the sum of stored daily reach, not deduplicated period reach.
      row.reach += numeric(item.reach);
      row.clicks += numeric(item.clicks);
      row.conversations += numeric(item.conversations);
      row.leads += numeric(item.leads);
      groups.set(item.breakdown_value, row);
    }
    return [...groups.values()]
      .map((row) => ({
        ...row,
        spend: money(row.spend),
        costPerLead: row.leads > 0 ? money(row.spend) / row.leads : null,
      }))
      .sort(
        (a, b) =>
          b.leads - a.leads ||
          b.conversations - a.conversations ||
          b.clicks - a.clicks ||
          b.impressions - a.impressions,
      );
  }

  return {
    summary: {
      ...totals,
      spend,
      leads: campaignLeads.length,
      quotes,
      clients,
      revenue,
      cac: clients > 0 ? spend / clients : null,
      roas: spend > 0 ? revenue / spend : null,
    },
    cityRows,
    ageRows: summarize("age"),
    regionRows: summarize("region"),
  };
}

/** The caller must order each page by a stable unique column, such as id. */
export async function fetchMarketingPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    rows.push(...(page as T[]));
    if (page.length < pageSize) return rows;
  }
}
