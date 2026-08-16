export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <section className="border-b border-border bg-gradient-to-br from-white via-secondary/70 to-sand/70 text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-22">
        {eyebrow && <p className="text-primary text-xs font-semibold uppercase tracking-widest">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-extrabold max-w-3xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-muted-foreground text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
