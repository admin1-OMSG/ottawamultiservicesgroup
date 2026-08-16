import { Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export type ServiceSeoContent = { eyebrow: string; title: string; intro: string; bullets: string[]; localText: string };
export function ServiceSeoPage({ content }: { content: ServiceSeoContent }) {
  return <div className="min-h-screen bg-background"><SiteHeader />
    <main>
      <section className="border-b bg-gradient-to-b from-teal-50 to-background py-16 sm:py-20"><div className="mx-auto max-w-5xl px-6"><p className="font-semibold uppercase tracking-[.18em] text-teal-700">{content.eyebrow}</p><h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{content.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{content.intro}</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/quote"><Button size="lg">Get a Free Quote</Button></Link><a href="tel:+16134076699"><Button size="lg" variant="outline"><Phone className="mr-2 h-4 w-4" />(613) 407-6699</Button></a></div></div></section>
      <section className="py-14"><div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-[1.2fr_.8fr]"><div><h2 className="text-2xl font-bold text-slate-900">What we can help with</h2><div className="mt-6 grid gap-3">{content.bullets.map(x=><div key={x} className="flex gap-3 rounded-xl border bg-white p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600"/><span>{x}</span></div>)}</div></div><aside className="rounded-2xl border bg-teal-50 p-6"><MapPin className="h-6 w-6 text-teal-700"/><h2 className="mt-3 text-xl font-bold">Serving Ottawa & nearby communities</h2><p className="mt-3 leading-7 text-slate-600">{content.localText}</p><p className="mt-4 text-sm text-slate-600">Ottawa · Kanata · Nepean · Barrhaven · Orleans · Stittsville · Gatineau</p></aside></div></section>
    </main><SiteFooter /></div>;
}
