import {
  createFileRoute,
  Outlet,
  useLocation,
} from "@tanstack/react-router"
import { AdminLayout } from "../components/admin/AdminLayout"

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow, noarchive" }] }),
  component: AdminRouteLayout,
})

function AdminRouteLayout() {
  const location = useLocation()
  const isLoginPage = location.pathname === "/admin/login"

  if (isLoginPage) {
    return <Outlet />
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}