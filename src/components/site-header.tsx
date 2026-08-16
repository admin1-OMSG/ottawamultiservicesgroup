import { Link } from "@tanstack/react-router";
import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import brandLogo from "@/assets/omsg-logo.png";
import { LanguageSwitcher } from "@/lib/language";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/partners", label: "Partners" },
  { to: "/portal", label: "Customer Portal" },
  { to: "/contact", label: "Contact" },
] as const;

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className={`grid h-14 w-14 shrink-0 sm:h-16 sm:w-16 place-items-center overflow-hidden rounded-full border shadow-sm ${light ? "border-white/30 bg-white" : "border-border bg-white"}`}>
      <img src={brandLogo} alt="Ottawa Multiservices Group logo" className="h-full w-full object-contain p-0.5" />
    </div>
  );
}

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "transparent" }) {
  const [open, setOpen] = useState(false);
  const isTransparent = variant === "transparent";
  const wrapper = isTransparent
    ? "absolute inset-x-0 top-0 z-40 border-b border-white/60 bg-white/88 shadow-sm backdrop-blur-xl"
    : "sticky top-0 z-40 border-b border-border/80 bg-white/94 shadow-sm backdrop-blur-xl";
  const linkClass = "text-foreground/75 hover:text-primary";
  const brandColor = "text-navy";
  const subColor = "text-muted-foreground";

  return (
    <header className={wrapper}>
      <div className="mx-auto flex min-h-[76px] max-w-[1480px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link to="/" className={`flex min-w-0 items-center gap-3 ${brandColor}`} aria-label="Ottawa Multiservices Group home">
          <BrandMark light={isTransparent} />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-[15px] font-extrabold sm:text-base">Ottawa Multiservices</div>
            <div className={`truncate text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[10px] ${subColor}`}>Group Inc.</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 text-[13px] font-medium lg:flex xl:gap-5 2xl:text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`${linkClass} whitespace-nowrap rounded-lg px-1.5 py-2 transition-colors hover:bg-secondary/70`}
              activeProps={{ className: "font-semibold text-accent" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden xl:block"><LanguageSwitcher compact /></div>
          <a
            href="tel:+16134076699"
            className="hidden items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-navy 2xl:inline-flex"
          >
            <Phone className="h-4 w-4" /> (613) 407-6699
          </a>
          <Link to="/partners" className="hidden 2xl:inline-flex">
            <Button variant="outline" className="h-10 rounded-xl border-accent/40 px-4 font-semibold text-accent hover:bg-accent/5">Become a Partner</Button>
          </Link>
          <Link to="/quote" className="hidden sm:inline-flex">
            <Button className="h-10 rounded-xl bg-gradient-to-r from-primary to-accent px-5 font-semibold text-white shadow-sm hover:brightness-105">Get a Quote</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden text-navy hover:bg-secondary"
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
            <div className="mt-3 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
              <a href="tel:+16134076699" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-navy">
                <Phone className="h-4 w-4" /> Call us
              </a>
              <Link to="/partners" onClick={() => setOpen(false)}>
                <Button variant="outline" className="h-11 w-full rounded-xl border-accent/40 font-semibold text-accent">Become a Partner</Button>
              </Link>
              <Link to="/quote" onClick={() => setOpen(false)}>
                <Button className="h-11 w-full rounded-xl bg-accent font-semibold text-accent-foreground">Get a Quote</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
