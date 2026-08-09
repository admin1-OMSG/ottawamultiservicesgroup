export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <section className="bg-navy text-navy-foreground">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {eyebrow && <p className="text-accent text-xs font-semibold uppercase tracking-widest">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-extrabold max-w-3xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-white/75 text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
