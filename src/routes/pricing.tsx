import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/pricing")({
  component: () => (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
      <Toaster richColors position="top-center" />
    </div>
  ),
});
