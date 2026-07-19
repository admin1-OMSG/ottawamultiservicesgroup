import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-navy-foreground pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center text-accent-foreground font-black">O</div>
            <span className="font-display font-bold">Ottawa Multi Services Group</span>
          </div>
          <p className="mt-4 text-sm text-white/70">Ottawa-Gatineau's trusted team for cleaning, moving, landscaping, snow removal and mobile services.</p>
          <div className="mt-5 flex gap-3 text-white/70">
            <a href="#" aria-label="Facebook" className="hover:text-accent"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-accent"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-accent"><Linkedin className="h-4 w-4" /></a>
            <a href="#" aria-label="YouTube" className="hover:text-accent"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
        <FooterCol title="Quick Links" links={[
          { label: "Services", to: "/services" },
          { label: "About", to: "/about" },
          { label: "FAQ", to: "/faq" },
          { label: "Blog", to: "/blog" },
          { label: "Contact", to: "/contact" },
        ]} />
        <FooterCol title="For You" links={[
          { label: "Get a Quote", to: "/quote" },
          { label: "Client Portal", to: "/portal" },
          { label: "Become a Partner", to: "/partners" },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Privacy Policy", to: "/privacy" },
          { label: "Terms & Conditions", to: "/terms" },
        ]} />
      </div>
      <div className="mx-auto max-w-7xl px-6 mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
        <div>© {new Date().getFullYear()} Ottawa Multi Services Group. All rights reserved.</div>
        <div>Ottawa · Gatineau · Kanata · Orleans · Barrhaven · Nepean · Stittsville</div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-4 space-y-2 text-sm text-white/70">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="hover:text-accent">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
