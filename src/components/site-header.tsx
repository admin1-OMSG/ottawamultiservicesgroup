import { Link } from "@tanstack/react-router";
import { Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import brandLogo from "@/assets/omsg-logo.png";
import { LanguageSwitcher, useLanguage } from "@/lib/language";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/pricing", label: "Cleaning Prices" },
  { to: "/about", label: "About" },
  { to: "/partners", label: "Partners" },
  { to: "/careers", label: "Careers" },
  { to: "/portal", label: "Customer Portal" },
  { to: "/contact", label: "Contact" },
] as const;

export function BrandMark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full border shadow-sm ${compact ? "h-9 w-9 sm:h-12 sm:w-12" : "h-14 w-14 sm:h-16 sm:w-16"} ${light ? "border-white/30 bg-white" : "border-border bg-white"}`}>
      <img src={brandLogo} alt="Ottawa Multiservices Group logo" className="h-full w-full object-contain p-0.5" />
    </div>
  );
}

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "transparent" }) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isTransparent = variant === "transparent";
  const wrapper = isTransparent
    ? "absolute inset-x-0 top-0 z-40 border-b border-white/60 bg-white/88 shadow-sm backdrop-blur-xl"
    : "sticky top-0 z-40 border-b border-border/80 bg-white/94 shadow-sm backdrop-blur-xl";
  const linkClass = "text-foreground/75 hover:text-primary";
  const brandColor = "text-navy";
  const subColor = "text-muted-foreground";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1280px)");
    const onDesktop = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={wrapper}>
      <div className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-8 xl:gap-4">
        <Link to="/" onClick={() => setOpen(false)} className={`flex min-w-0 items-center gap-2 ${brandColor}`} aria-label={language === "fr" ? "Ottawa Multiservices Group — Accueil" : "Ottawa Multiservices Group home"}>
          <BrandMark light={isTransparent} compact />
          <div className="min-w-0 leading-tight">
            <div className="max-w-[92px] font-display text-xs font-extrabold sm:max-w-none sm:whitespace-nowrap sm:text-[15px]">Ottawa Multiservices</div>
            <div className={`text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] ${subColor}`}>Group Inc.</div>
          </div>
        </Link>

        <nav aria-label={language === "fr" ? "Navigation principale" : "Main navigation"} className="hidden items-center gap-0.5 text-[13px] font-medium xl:flex 2xl:gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`${linkClass} inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-1.5 py-2 transition-colors hover:bg-secondary/70`}
              activeProps={{ className: "font-semibold text-accent" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher compact />
          <Button asChild className="hidden h-11 rounded-xl bg-teal-800 px-4 font-semibold text-white shadow-sm hover:bg-teal-900 sm:inline-flex">
            <Link to="/quote">Get a Quote</Link>
          </Button>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            aria-label={language === "fr" ? (open ? "Fermer le menu" : "Ouvrir le menu") : (open ? "Close menu" : "Open menu")}
            aria-expanded={open}
            aria-controls="site-mobile-navigation"
            onClick={() => setOpen((o) => !o)}
            className="h-11 w-11 text-navy hover:bg-secondary xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav id="site-mobile-navigation" aria-label={language === "fr" ? "Navigation principale" : "Main navigation"} className="absolute inset-x-0 top-full max-h-[calc(100dvh-76px)] overflow-y-auto overscroll-contain border-t border-border bg-background shadow-xl xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-base font-medium text-foreground/80 hover:bg-secondary hover:text-navy"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
              <a href="tel:+16134076699" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-navy">
                <Phone className="h-4 w-4" /> Call us
              </a>
              <Button asChild variant="outline" className="h-11 w-full rounded-xl border-accent/40 font-semibold text-accent">
                <Link to="/partners" onClick={() => setOpen(false)}>Become a Partner</Link>
              </Button>
              <Button asChild className="h-11 w-full rounded-xl bg-accent font-semibold text-accent-foreground">
                <Link to="/quote" onClick={() => setOpen(false)}>Get a Quote</Link>
              </Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
