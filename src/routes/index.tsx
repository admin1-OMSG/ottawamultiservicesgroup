import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, ChevronDown, MapPin, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language";
import { PROFESSIONAL_SERVICE_OPTIONS } from "@/features/professionals/model";
import repairPhoto from "@/assets/omsg-repairs-service.png";
import gardenPhoto from "@/assets/omsg-landscaping-service.png";
import cleaningPhoto from "@/assets/cleaning/residential-v5.webp";
import movingPhoto from "@/assets/omsg-moving-service.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OMSG | Find local service professionals in Ottawa–Gatineau" },
      { name: "description", content: "Request a service for free, compare local professionals and follow their replies in Ottawa and Gatineau." },
      { property: "og:title", content: "OMSG | Find a local service professional" },
      { property: "og:description", content: "Connect with professionals serving Ottawa–Gatineau." },
    ],
    links: [{ rel: "canonical", href: "https://www.ottawamultiservicesgroup.com/" }],
  }),
  component: MarketplaceHome,
});

const featured = [
  { key: "cleaning", image: cleaningPhoto, en: "Home cleaning", fr: "Nettoyage résidentiel" },
  { key: "moving", image: movingPhoto, en: "Moving", fr: "Déménagement" },
  { key: "handyman", image: repairPhoto, en: "Handyman services", fr: "Petits travaux" },
  { key: "landscaping", image: gardenPhoto, en: "Yard care", fr: "Jardinage" },
];

function MarketplaceHome() {
  const { language } = useLanguage();
  const fr = language === "fr";
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader />
      <main data-i18n-ignore="true">
        <section className="overflow-hidden border-b border-stone-200 bg-[#f5f4ed]">
          <div className="mx-auto grid max-w-[1340px] items-center gap-9 px-5 py-10 sm:px-9 sm:py-12 lg:grid-cols-[1.03fr_1fr] lg:gap-14 lg:px-12 lg:py-16">
            <div className="min-w-0">
              <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-teal-900"><MapPin size={17} aria-hidden="true" /> Ottawa–Gatineau</p>
              <h1 className="max-w-[16ch] font-display text-[clamp(2.6rem,5.1vw,5rem)] font-bold leading-[1.02] tracking-[-.055em] text-[#183c36]">{fr ? "Quel service cherchez-vous ?" : "What service do you need?"}</h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#425751] sm:text-lg">{fr ? "Décrivez votre projet gratuitement et échangez avec des professionnels de votre région." : "Post your request for free and hear from professionals who work in your area."}</p>
              <form action="/marketplace" method="get" className="mt-7 flex max-w-xl flex-col gap-2 rounded-2xl border border-stone-300 bg-white p-2 shadow-sm sm:flex-row">
                <input type="hidden" name="new" value="1" />
                <label className="relative flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 focus-within:ring-2 focus-within:ring-teal-700">
                  <Search className="shrink-0 text-teal-700" size={20} aria-hidden="true" /><span className="sr-only">{fr ? "Type de service" : "Type of service"}</span>
                  <select name="category" defaultValue="" className="h-full min-h-12 w-full appearance-none bg-transparent pr-6 text-base font-medium outline-none">
                    <option value="">{fr ? "Choisir un service" : "Choose a service"}</option>
                    {PROFESSIONAL_SERVICE_OPTIONS.map(option => <option key={option.value} value={option.value}>{fr ? option.fr : option.en}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-2" />
                </label>
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b5b4c] px-5 font-bold text-white hover:bg-teal-950">{fr ? "Créer ma demande" : "Post my request"} <ArrowRight size={17} aria-hidden="true" /></button>
              </form>
              <Link to="/marketplace" className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-teal-900 underline underline-offset-4">{fr ? "Suivre mes demandes" : "Track my requests"} <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
            <div className="relative isolate min-h-[235px] sm:min-h-[340px] lg:min-h-[415px]">
              <img src={repairPhoto} alt={fr ? "Un professionnel effectue des travaux de menuiserie" : "A professional fitting hardware on a door"} fetchPriority="high" className="absolute inset-y-0 right-0 h-full w-[82%] rounded-[2rem] rounded-tr-[5.5rem] object-cover object-[55%_center] shadow-sm" />
              <img src={gardenPhoto} alt={fr ? "Un jardinier taille une haie" : "A gardener trimming a hedge"} className="absolute bottom-[-.4rem] left-0 h-[53%] w-[35%] rounded-2xl border-[5px] border-[#f5f4ed] object-cover object-center" />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-[1340px] px-5 py-12 sm:px-9 lg:px-12 lg:py-16">
          <h2 className="font-display text-3xl font-bold tracking-[-.04em] text-[#183c36] sm:text-4xl">{fr ? "Services dans votre région" : "Services in your area"}</h2>
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
            {featured.map(item => (
              <a key={item.key} href={'/marketplace?new=1&category=' + item.key} className="group block rounded-xl">
                <div className="overflow-hidden rounded-xl bg-stone-100"><img src={item.image} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" /></div>
                <div className="mt-3 flex items-center justify-between gap-1 font-bold tracking-tight text-[#183c36] sm:text-lg">{fr ? item.fr : item.en}<ArrowUpRight size={16} className="shrink-0" /></div>
              </a>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-[1340px] px-5 pb-12 sm:px-9 lg:px-12 lg:pb-16">
          <div className="flex flex-col justify-between gap-6 rounded-3xl bg-[#163f37] p-7 text-white sm:p-10 lg:flex-row lg:items-center">
            <div><BriefcaseBusiness className="mb-3 text-[#c5e18f]" aria-hidden="true" size={23} />
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{fr ? "Vous offrez un service ?" : "Do you offer a service?"}</h2>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-teal-50">{fr ? "Présentez votre entreprise, indiquez où vous travaillez et recevez les demandes qui vous correspondent." : "Introduce your business, choose your service area and receive requests that match your work."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link to="/pro-pricing" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#d7eaa9] px-5 font-bold text-[#173e31] hover:bg-white">{fr ? "Voir les tarifs pros" : "See pro pricing"} <ArrowRight size={16} /></Link>
              <Link to="/pro" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{fr ? "Créer mon profil" : "Create my profile"}</Link>
              <Link to="/pro-market" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{fr ? "Mon tableau de bord" : "My dashboard"}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
