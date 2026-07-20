export type QuoteStatus =
  | "new"
  | "contacted"
  | "estimate_scheduled"
  | "quote_sent"
  | "accepted"
  | "declined"
  | "in_progress"
  | "completed"
  | "cancelled"

export type DashboardStats = {
  totalQuotes: number
  totalCustomers: number
  activeQuotes: number
  completedQuotes: number
}

export type RecentQuote = {
  id: string
  requestNumber: number
  customerName: string
  serviceName: string
  status: QuoteStatus
  createdAt: string
}

export type StatusSummary = {
  status: QuoteStatus
  count: number
}

export type PopularService = {
  serviceName: string
  requestCount: number
}

export type DashboardData = {
  stats: DashboardStats
  recentQuotes: RecentQuote[]
  statusSummary: StatusSummary[]
  popularServices: PopularService[]
}