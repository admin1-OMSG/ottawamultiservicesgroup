import { createFileRoute, Outlet } from "@tanstack/react-router"
import { AdminLayout } from "@/components/admin/AdminLayout"

export const Route = createFileRoute("/admin")({
  component: AdminRouteLayout,
})

function AdminRouteLayout() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}