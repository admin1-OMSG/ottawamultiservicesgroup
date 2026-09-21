// Readable service annex saved in the quote's existing terms. No live catalogue lookup.
export type ScopeLocale = "en" | "fr";
export type ScopeSection = { id: string; title: string; lines: string[] };
export type ServiceScope = { locale: ScopeLocale; sections: ScopeSection[]; body: string };
const end = "=== END OMSG SERVICE SCOPE ===";
const start = (locale: ScopeLocale) => `=== OMSG SERVICE SCOPE V1 (${locale}) ===`;
const pattern =
  /(?:^|\n)=== OMSG SERVICE SCOPE V1 \((en|fr)\) ===\n([\s\S]*?)\n=== END OMSG SERVICE SCOPE ===(?=\n|$)/g;
export function scopeSections(body: string): ScopeSection[] {
  if (!body || body.length > 60000 || !body.trim().startsWith("## ")) return [];
  const used = new Set<string>();
  return body
    .trim()
    .split(/^## /m)
    .filter(Boolean)
    .map((block, index) => {
      const [title, ...raw] = block.trim().split("\n");
      const match = title.match(
        /^(?:Visit|Visite) ([1-4])$|^(?:Visit 5 onward|À partir de la visite 5)$/,
      );
      let id = match ? (match[1] ? `visit-${match[1]}` : "visit-5") : `section-${index}`;
      if (used.has(id)) id = `section-${index}`;
      used.add(id);
      return {
        id,
        title: title.trim(),
        lines: raw.map((line) => line.replace(/^- /, "").trim()).filter(Boolean),
      };
    })
    .filter((section) => section.title && section.lines.length);
}
export function readServiceScope(terms: string | null | undefined): ServiceScope | null {
  if (!terms || terms.length > 120000) return null;
  const matches = [...terms.matchAll(new RegExp(pattern.source, "g"))];
  if (matches.length !== 1) return null;
  const [, locale, body] = matches[0];
  const sections = scopeSections(body);
  return sections.length ? { locale: locale as ScopeLocale, sections, body: body.trim() } : null;
}
export function termsWithoutScope(terms: string | null | undefined): string {
  if (!readServiceScope(terms)) return terms || "";
  return (terms || "").replace(new RegExp(pattern.source, "g"), "").trim();
}
export function validServiceScope(body: string): boolean {
  return !!scopeSections(body).length && !/=== (?:END )?OMSG SERVICE SCOPE/.test(body);
}
export function attachServiceScope(terms: string, body: string, locale: ScopeLocale): string {
  if (!body.trim()) return termsWithoutScope(terms);
  if (!validServiceScope(body)) throw new Error("Invalid service scope / Prestations invalides");
  return [termsWithoutScope(terms), `${start(locale)}\n${body.trim()}\n${end}`]
    .filter(Boolean)
    .join("\n\n");
}
export const escapeScopeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
export function renderServiceScopeHtml(
  terms: string | null | undefined,
  locale: ScopeLocale,
): string {
  const scope = readServiceScope(terms);
  if (!scope) return "";
  const title =
    locale === "fr" ? "Prestations prévues par visite" : "Services included, visit by visit";
  return `<section style="margin:22px 0;border:1px solid #cbd5e1;border-radius:10px;padding:18px"><h2 style="font-size:19px;margin:0 0 12px">${title}</h2><p style="color:#475569;font-size:13px">${locale === "fr" ? "Cette annexe est enregistrée avec votre devis. Le détail ci-dessous fait partie des prestations proposées." : "This annex is saved with your quote. The details below form part of the proposed services."}</p>${scope.sections.map((section) => `<div style="margin-top:18px"><h3 style="font-size:15px;margin:0 0 6px;color:#0f766e">${escapeScopeHtml(section.title)}</h3><ul style="padding-left:20px;margin:0">${section.lines.map((line) => `<li style="margin:5px 0;overflow-wrap:anywhere">${escapeScopeHtml(line)}</li>`).join("")}</ul></div>`).join("")}</section>`;
}

/** Plain-text rendering for inherited invoice terms and PDF pages. */
export function readableQuoteTerms(terms: string | null | undefined): string {
  const scope = readServiceScope(terms);
  if (!scope) return terms || "";
  return [
    termsWithoutScope(terms),
    scope.locale === "fr" ? "ANNEXE — PRESTATIONS PAR VISITE" : "ANNEX — SERVICES BY VISIT",
    scope.body.replace(/^## /gm, ""),
  ]
    .filter(Boolean)
    .join("\n\n");
}
