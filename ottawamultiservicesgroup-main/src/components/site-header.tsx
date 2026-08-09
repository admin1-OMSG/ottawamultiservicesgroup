import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/partners", label: "Partners" },
  { to: "/quote", label: "Get a Quote" },
  { to: "/portal", label: "Client Portal" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "transparent" }) {
  const [open, setOpen] = useState(false);
  const isTransparent = variant === "transparent";
  const wrapper = isTransparent
    ? "absolute inset-x-0 top-0 z-30"
    : "sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border";
  const linkClass = isTransparent
    ? "text-white/90 hover:text-white"
    : "text-foreground/80 hover:text-navy";
  const brandColor = isTransparent ? "text-white" : "text-navy";
  const subColor = isTransparent ? "text-white/70" : "text-muted-foreground";

  return (
    <header className={wrapper}>
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/" className={`flex items-center gap-2 ${brandColor}`}>
          <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center text-accent-foreground font-black">O</div>
          <div className="leading-tight">
            <div className="font-display font-bold text-base">Ottawa MSG</div>
            <div className={`text-[11px] uppercase tracking-widest ${subColor}`}>Multi Services Group</div>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={linkClass}
              activeProps={{ className: "font-semibold text-accent" }}
              activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/quote" className="hidden sm:inline-flex">
            <Button className="bg-accent text-accent-foreground hover:brightness-105">Free Quote</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}
            className={`lg:hidden ${isTransparent ? "text-white hover:bg-white/10 hover:text-white" : ""}`}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="px-6 py-4 flex flex-col gap-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className="text-sm text-foreground/80 hover:text-accent">{n.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
