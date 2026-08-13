import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { BrandMark } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-navy-foreground pt-14 sm:pt-16 pb-8">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark light />
            <div>
              <div className="font-display font-bold">Ottawa Multiservices Group Inc.</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">One company. Multiple solutions.</div>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">Home and property services across Ottawa and Gatineau, with clear quotes, online scheduling and a client portal that keeps everything in one place.</p>
          <div className="mt-5 space-y-2 text-sm">
            <a href="tel:+16134076699" className="flex items-center gap-2 font-semibold text-white hover:text-accent"><Phone className="h-4 w-4" />(613) 407-6699</a>
            <a href="mailto:info@ottawamultiservicesgroup.com" className="flex items-center gap-2 text-white/75 hover:text-accent"><Mail className="h-4 w-4" />info@ottawamultiservicesgroup.com</a>
            <div className="flex items-center gap-2 text-white/65"><MapPin className="h-4 w-4" />Ottawa · Gatineau</div>
          </div>
          <div className="mt-5 flex gap-4 text-white/65">
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
        <FooterCol title="For Customers" links={[
          { label: "Get a Quote", to: "/quote" },
          { label: "Customer Portal", to: "/portal" },
          { label: "Become a Partner", to: "/partners" },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Privacy Policy", to: "/privacy" },
          { label: "Terms & Conditions", to: "/terms" },
        ]} />
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 px-4 pt-6 text-center text-xs text-white/55 sm:px-6 md:flex-row md:text-left lg:px-8">
        <div>© {new Date().getFullYear()} Ottawa Multiservices Group Inc. All rights reserved.</div>
        <div>Ottawa · Gatineau · Kanata · Orleans · Barrhaven · Nepean · Stittsville</div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm text-white/68">
        {links.map((l) => (
          <li key={l.to + l.label}><Link to={l.to} className="hover:text-accent">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
