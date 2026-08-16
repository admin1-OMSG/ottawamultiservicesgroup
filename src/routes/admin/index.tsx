import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { AlertTriangle, Boxes, BriefcaseBusiness, Handshake, LogOut, RefreshCw } from "lucide-react"

import { PageHeader } from "@/components/admin/PageHeader"
import { getDashboardStats } from "@/features/dashboard/api/getDashboardStats"
import { DashboardStats as DashboardStatsCards } from "@/features/dashboard/components/DashboardStats"
import { PopularServices } from "@/features/dashboard/components/PopularServices"
import { RecentQuotes } from "@/features/dashboard/components/RecentQuotes"
import { StatusChart } from "@/features/dashboard/components/StatusChart"
import type {
  PopularService,
  RecentQuote,
  StatusSummary,
} from "@/features/dashboard/types"
import { supabase } from "@/lib/supabase"

type AdminProfile = {
  id: string
  full_name: string
  role: "admin" | "super_admin"
  is_active: boolean
}

type DashboardData = {
  totalQuotes: number
  totalCustomers: number
  activeQuotes: number
  completedQuotes: number
  partnerApplications: number
  newPartnerApplications: number
  subcontractingOpportunities: number
  activePartners: number
  inventoryItems: number
  lowStockItems: number
  inventoryValue: number
}

const initialDashboardData: DashboardData = {
  totalQuotes: 0,
  totalCustomers: 0,
  activeQuotes: 0,
  completedQuotes: 0,
  partnerApplications: 0,
  newPartnerApplications: 0,
  subcontractingOpportunities: 0,
  activePartners: 0,
  inventoryItems: 0,
  lowStockItems: 0,
  inventoryValue: 0,
}

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      {
        title: "Admin Dashboard | Ottawa Multiservices Group",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const navigate = useNavigate()

  const [admin, setAdmin] = useState<AdminProfile | null>(null)

  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialDashboardData)

  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([])
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>([])
  const [popularServices, setPopularServices] = useState<PopularService[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadPage() {
      try {
        setErrorMessage("")

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          await navigate({
            to: "/admin/login",
          })

          return
        }

        const { data: adminProfile, error: adminError } = await supabase
          .from("admin_users")
          .select("id, full_name, role, is_active")
          .eq("id", user.id)
          .eq("is_active", true)
          .maybeSingle()

        if (adminError || !adminProfile) {
          console.error("Admin profile error:", adminError)

          await supabase.auth.signOut()

          await navigate({
            to: "/admin/login",
          })

          return
        }

        if (!isMounted) {
          return
        }

        setAdmin(adminProfile as AdminProfile)

        await loadDashboardData(isMounted)
      } catch (error) {
        console.error("Dashboard page loading error:", error)

        if (isMounted) {
          setErrorMessage(
            "The dashboard could not be loaded. Please refresh the page.",
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPage()

    return () => {
      isMounted = false
    }
  }, [navigate])

  async function loadDashboardData(componentIsMounted = true) {
    const errors: string[] = []

    try {
      const dashboardResult = await getDashboardStats()

      if (componentIsMounted) {
        setDashboardData((currentData) => ({
          ...currentData,
          totalQuotes: dashboardResult.stats.totalQuotes,
          totalCustomers: dashboardResult.stats.totalCustomers,
          activeQuotes: dashboardResult.stats.activeQuotes,
          completedQuotes: dashboardResult.stats.completedQuotes,
        }))

        setRecentQuotes(dashboardResult.recentQuotes)
        setStatusSummary(dashboardResult.statusSummary)
        setPopularServices(dashboardResult.popularServices)
      }
    } catch (error) {
      console.error("Dashboard statistics error:", error)

      errors.push(
        "Some dashboard statistics could not be loaded.",
      )
    }

    try {
      const [applicationsResult, partnersResult, inventoryResult] = await Promise.all([
        supabase.from("partner_applications").select("application_type,review_status"),
        supabase.from("partners").select("status"),
        supabase.from("inventory_items").select("quantity,unit_cost,reorder_level,status"),
      ])
      if (applicationsResult.error) throw applicationsResult.error
      if (partnersResult.error) throw partnersResult.error
      if (inventoryResult.error) throw inventoryResult.error

      const applications = applicationsResult.data ?? []
      const partners = partnersResult.data ?? []
      const inventory = inventoryResult.data ?? []
      if (componentIsMounted) {
        setDashboardData((currentData) => ({
          ...currentData,
          partnerApplications: applications.length,
          newPartnerApplications: applications.filter((x) => x.review_status === "new").length,
          subcontractingOpportunities: applications.filter((x) => x.application_type === "subcontracting_client" && x.review_status !== "rejected").length,
          activePartners: partners.filter((x) => x.status === "active").length,
          inventoryItems: inventory.filter((x) => x.status === "active").length,
          lowStockItems: inventory.filter((x) => x.status === "active" && Number(x.quantity) <= Number(x.reorder_level)).length,
          inventoryValue: inventory.reduce((sum, x) => sum + Number(x.quantity || 0) * Number(x.unit_cost || 0), 0),
        }))
      }
    } catch (error) {
      console.error("Business overview statistics error:", error)
      errors.push("Partner or inventory statistics could not be loaded.")
    }

    if (componentIsMounted) {
      setErrorMessage(errors.join(" "))
    }
  }

  async function handleRefresh() {
    try {
      setIsRefreshing(true)
      setErrorMessage("")

      await loadDashboardData(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()

    await navigate({
      to: "/admin/login",
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600" />

          <p className="mt-4 text-sm text-slate-600">
            Loading administration dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
      >
        {errorMessage || "The administrator profile could not be loaded."}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${admin.full_name}. Here is an overview of your business activity.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />

              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        }
      />

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
        >
          <p className="font-semibold">
            Some dashboard information is unavailable.
          </p>

          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      <DashboardStatsCards
        stats={{
          totalQuotes: dashboardData.totalQuotes,
          totalCustomers: dashboardData.totalCustomers,
          activeQuotes: dashboardData.activeQuotes,
          completedQuotes: dashboardData.completedQuotes,
        }}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentQuotes quotes={recentQuotes} />
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Business overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Additional activity in your CRM.
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Partner applications
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Applications received from potential partners.
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Handshake className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-950">
              {dashboardData.partnerApplications}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <OverviewMetric icon={<BriefcaseBusiness className="h-4 w-4" />} label="Active partners" value={dashboardData.activePartners} note={`${dashboardData.newPartnerApplications} new application(s)`} />
            <OverviewMetric icon={<Handshake className="h-4 w-4" />} label="Subcontracting opportunities" value={dashboardData.subcontractingOpportunities} note="Open/contacted opportunities" />
            <OverviewMetric icon={<Boxes className="h-4 w-4" />} label="Inventory" value={dashboardData.inventoryItems} note={`Stock value ${new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(dashboardData.inventoryValue)}`} />
            <OverviewMetric icon={<AlertTriangle className="h-4 w-4" />} label="Low stock alerts" value={dashboardData.lowStockItems} note="At or below reorder level" />
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <StatusChart statuses={statusSummary} />

        <PopularServices services={popularServices} />
      </section>
    </div>
  )
}

function calculateActivePercentage(
  activeQuotes: number,
  totalQuotes: number,
) {
  if (totalQuotes === 0) {
    return 0
  }

  return Math.round((activeQuotes / totalQuotes) * 100)
}
function OverviewMetric({icon,label,value,note}:{icon:React.ReactNode;label:string;value:number;note:string}) {
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-emerald-700">{icon}<p className="text-sm font-semibold text-slate-900">{label}</p></div><p className="mt-3 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>
}
