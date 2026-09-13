import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Match the lg breakpoint used by the desktop sidebar and mobile trigger.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };

    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <div className="min-h-screen bg-gradient-to-br from-teal-50/80 via-slate-50 to-cyan-50/70">
        <div className="flex min-h-screen">
          <div className="hidden shrink-0 lg:block">
            <Sidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              menuTrigger={
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:hidden"
                  >
                    <Menu className="h-6 w-6" aria-hidden="true" />
                  </button>
                </SheetTrigger>
              }
            />

            <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
      <SheetContent
        side="left"
        className="h-dvh max-h-dvh w-[min(20rem,90vw)] gap-0 overflow-hidden bg-white p-0 sm:max-w-none [&>button]:right-2 [&>button]:top-2 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg"
      >
        <SheetTitle className="sr-only">Admin navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Choose a section of Ottawa Multiservices CRM.
        </SheetDescription>
        <Sidebar
          className="h-full min-h-0 w-full border-r-0 [&>div:first-child]:pr-16"
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
