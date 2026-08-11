import { Link } from "@tanstack/react-router";
import { House, Menu, Phone, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/partners", label: "Partners" },
  { to: "/portal", label: "Client Portal" },
  { to: "/contact", label: "Contact" },
] as const;

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
      <House className="h-5 w-5" strokeWidth={2.4} />
      <Sparkles className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white p-0.5 text-accent" />
      <span className={`absolute -bottom-1 h-1.5 w-5 rounded-full ${light ? "bg-white/80" : "bg-navy"}`} />
    </div>
  );
}

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "transparent" }) {
  const [open, setOpen] = useState(false);
  const isTransparent = variant === "transparent";
  const wrapper = isTransparent
    ? "absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-navy/20 backdrop-blur-sm"
    : "sticky top-0 z-40 border-b border-border bg-background/95 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur";
  const linkClass = isTransparent ? "text-white/90 hover:text-white" : "text-foreground/75 hover:text-navy";
  const brandColor = isTransparent ? "text-white" : "text-navy";
  const subColor = isTransparent ? "text-white/65" : "text-muted-foreground";

  return (
    <header className={wrapper}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className={`flex min-w-0 items-center gap-3 ${brandColor}`} aria-label="Ottawa Multiservices Group home">
          <BrandMark light={isTransparent} />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-[15px] font-extrabold sm:text-base">Ottawa Multiservices</div>
            <div className={`truncate text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[10px] ${subColor}`}>Group Inc.</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm lg:flex xl:gap-7">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`${linkClass} transition-colors`}
              activeProps={{ className: "font-semibold text-accent" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="tel:+16134076699"
            className={`hidden items-center gap-1.5 whitespace-nowrap text-sm font-semibold xl:inline-flex ${isTransparent ? "text-white" : "text-navy"}`}
          >
            <Phone className="h-4 w-4" /> (613) 407-6699
          </a>
          <Link to="/quote" className="hidden sm:inline-flex">
            <Button className="h-10 rounded-xl bg-accent px-5 font-semibold text-accent-foreground shadow-sm hover:brightness-105">Free Quote</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`lg:hidden ${isTransparent ? "text-white hover:bg-white/10 hover:text-white" : ""}`}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background shadow-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-navy"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <a href="tel:+16134076699" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-navy">
                <Phone className="h-4 w-4" /> Call us
              </a>
              <Link to="/quote" onClick={() => setOpen(false)}>
                <Button className="h-11 w-full rounded-xl bg-accent font-semibold text-accent-foreground">Free Quote</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
