import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { BrandMark } from "@/components/site-header";
import { useLanguage } from "@/lib/language";
import { openPrivacyPreferences } from "@/lib/marketing-consent";
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function SiteFooter() {
  const { language } = useLanguage();
  return (
    <footer className="border-t border-teal-200 bg-white pt-12 pb-8 text-slate-700 sm:pt-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-14 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark light />
            <div>
              <div className="font-display text-lg font-bold leading-snug text-teal-950">
                <span className="block">Ottawa Multiservices</span>
                <span className="block">Group Inc.</span>
              </div>
              <div className="mt-2 text-xs font-medium uppercase leading-relaxed tracking-[0.1em] text-teal-800">
                One company. Multiple solutions.
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
            Home and property services across Ottawa and Gatineau, with clear quotes, online
            scheduling and a client portal that keeps everything in one place.
          </p>
          <div className="mt-5 space-y-1 text-base">
            <a
              href="tel:+16134076699"
              className="flex min-h-11 items-center gap-3 font-semibold text-teal-800 hover:underline"
            >
              <Phone className="h-4 w-4" />
              (613) 407-6699
            </a>
            <a
              href="mailto:info@ottawamultiservicesgroup.com"
              className="flex min-h-11 items-start gap-3 py-2 text-sm leading-relaxed text-slate-700 hover:underline"
            >
              <Mail className="mt-1 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-all">info@ottawamultiservicesgroup.com</span>
            </a>
            <div className="flex min-h-11 items-center gap-3 text-slate-700">
              <MapPin className="h-4 w-4" />
              Ottawa · Gatineau
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-teal-800">
            <a
              href="https://www.facebook.com/profile.php?id=61594145271067"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-200 bg-teal-50 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://www.instagram.com/ottawamultiservicesgroup/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-200 bg-teal-50 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/company/ottawa-multiservices-group-inc/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-200 bg-teal-50 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="https://www.youtube.com/@OttawaMultiservicesGroup"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-200 bg-teal-50 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <Youtube className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/OttawaMultiSG"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-200 bg-teal-50 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <XIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="grid gap-8 border-t border-teal-100 pt-8 sm:grid-cols-3 lg:border-t-0 lg:pt-0">
          <FooterCol
            title="Quick Links"
            links={[
              { label: "Services", to: "/services" },
              { label: "Cleaning Prices", to: "/pricing" },
              { label: "About", to: "/about" },
              { label: "FAQ", to: "/faq" },
              { label: "Blog", to: "/blog" },
              { label: "Contact", to: "/contact" },
              { label: language === "fr" ? "Carrières" : "Careers", to: "/careers" },
            ]}
          />
          <FooterCol
            title="For Customers"
            links={[
              { label: "Get a Quote", to: "/quote" },
              { label: "Customer Portal", to: "/portal" },
              { label: "Become a Partner", to: "/partners" },
            ]}
          />
          <div>
            <FooterCol
              title="Legal"
              links={[
                { label: "Privacy Policy", to: "/privacy" },
                { label: "Pricing Policy", to: "/pricing-policy" },
                { label: "Terms & Conditions", to: "/terms" },
              ]}
            />
            <button
              type="button"
              data-i18n-ignore="true"
              onClick={openPrivacyPreferences}
              className="mt-1 min-h-11 py-2 text-left text-base leading-relaxed underline-offset-4 hover:text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              {language === "fr" ? "Préférences de confidentialité" : "Privacy preferences"}
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-teal-100 px-4 pt-6 text-center text-sm leading-relaxed text-slate-600 sm:px-6 md:flex-row md:text-left lg:px-8">
        <div data-i18n-ignore="true">
          © {new Date().getFullYear()} Ottawa Multiservices Group Inc.{" "}
          {language === "fr" ? "Tous droits réservés." : "All rights reserved."}
        </div>
        <div>Ottawa · Gatineau · Kanata · Orleans · Barrhaven · Nepean · Stittsville</div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div className="min-w-0">
      <h2 className="font-display text-base font-bold text-teal-950">{title}</h2>
      <ul className="mt-3 space-y-1 text-base text-slate-700">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link
              to={l.to}
              className="inline-flex min-h-11 items-center py-2 leading-relaxed underline-offset-4 hover:text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
