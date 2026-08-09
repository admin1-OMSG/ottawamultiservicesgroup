import { supabase } from "@/lib/supabase"
import type {
  DashboardData,
  PopularService,
  QuoteStatus,
  RecentQuote,
  StatusSummary,
} from "../types"

const activeStatuses: QuoteStatus[] = [
  "new",
  "contacted",
  "estimate_scheduled",
  "quote_sent",
  "accepted",
  "in_progress",
]

export async function getDashboardStats(): Promise<DashboardData> {
  const [
    totalQuotesResult,
    customersResult,
    activeQuotesResult,
    completedQuotesResult,
    recentQuotesResult,
    statusResult,
    servicesResult,
  ] = await Promise.all([
    supabase
      .from("service_requests")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("customers")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("service_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .in("status", activeStatuses),

    supabase
      .from("service_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "completed"),

    supabase
      .from("service_requests")
      .select(`
        id,
        request_number,
        first_name,
        last_name,
        service_name,
        status,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(5),

    supabase
      .from("service_requests")
      .select("status"),

    supabase
      .from("service_requests")
      .select("service_name"),
  ])

  const results = [
    totalQuotesResult,
    customersResult,
    activeQuotesResult,
    completedQuotesResult,
    recentQuotesResult,
    statusResult,
    servicesResult,
  ]

  const failedResult = results.find((result) => result.error)

  if (failedResult?.error) {
    throw failedResult.error
  }

  const recentQuotes: RecentQuote[] = (recentQuotesResult.data ?? []).map(
    (quote) => ({
      id: quote.id,
      requestNumber: quote.request_number,
      customerName: formatCustomerName(
        quote.first_name,
        quote.last_name,
      ),
      serviceName: quote.service_name ?? "Service not specified",
      status: quote.status as QuoteStatus,
      createdAt: quote.created_at,
    }),
  )

  const statusMap = new Map<QuoteStatus, number>()

  for (const row of statusResult.data ?? []) {
    const status = row.status as QuoteStatus

    statusMap.set(
      status,
      (statusMap.get(status) ?? 0) + 1,
    )
  }

  const statusSummary: StatusSummary[] = Array.from(
    statusMap.entries(),
  ).map(([status, count]) => ({
    status,
    count,
  }))

  const serviceMap = new Map<string, number>()

  for (const row of servicesResult.data ?? []) {
    const serviceName =
      row.service_name?.trim() || "Service not specified"

    serviceMap.set(
      serviceName,
      (serviceMap.get(serviceName) ?? 0) + 1,
    )
  }

  const popularServices: PopularService[] = Array.from(
    serviceMap.entries(),
  )
    .map(([serviceName, count]) => ({
      serviceName,
      count,
    }))
    .sort((firstService, secondService) => {
      return secondService.count - firstService.count
    })
    .slice(0, 5)

  return {
    stats: {
      totalQuotes: totalQuotesResult.count ?? 0,
      totalCustomers: customersResult.count ?? 0,
      activeQuotes: activeQuotesResult.count ?? 0,
      completedQuotes: completedQuotesResult.count ?? 0,
    },
    recentQuotes,
    statusSummary,
    popularServices,
  }
}

function formatCustomerName(
  firstName: string | null,
  lastName: string | null,
) {
  const fullName = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim()

  return fullName || "Unknown customer"
}