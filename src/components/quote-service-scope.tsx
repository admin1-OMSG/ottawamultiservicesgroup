import { useLanguage } from "@/lib/language";
import {
  readServiceScope,
  type ServiceScope,
} from "../../supabase/functions/_shared/quote-service-scope";

export function openScopeSection(quoteId: string, sectionId?: string) {
  const parent = document.getElementById(`quote-services-${quoteId}`) as HTMLDetailsElement | null;
  if (!parent) return;
  parent.open = true;
  const target = sectionId
    ? document.getElementById(`quote-services-${quoteId}-${sectionId}`)
    : parent;
  if (target instanceof HTMLDetailsElement) target.open = true;
  (target || parent).scrollIntoView({ behavior: "smooth", block: "start" });
  const heading = (target || parent).querySelector("summary") as HTMLElement | null;
  heading?.focus({ preventScroll: true });
}
function ScopeBody({ scope, quoteId }: { scope: ServiceScope; quoteId: string }) {
  const common = scope.sections.find((section) =>
    /^(Included cleaning|Nettoyage compris)$/.test(section.title),
  );
  return (
    <div className="mt-4 space-y-4">
      {scope.sections.map((section) => {
        const lines = (
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {section.lines.map((line, index) => (
              <li className="break-words" key={index}>
                {line}
              </li>
            ))}
          </ul>
        );
        return section.id.startsWith("visit-") ? (
          <details
            key={section.id}
            id={`quote-services-${quoteId}-${section.id}`}
            className="scroll-mt-24 rounded-lg border bg-white p-4"
          >
            <summary className="cursor-pointer font-semibold text-teal-900">
              {section.title}
            </summary>
            {common &&
              section.lines.some((line) =>
                /All the tasks listed under Included cleaning|Toutes les tâches de la rubrique Nettoyage compris/.test(
                  line,
                ),
              ) && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold">{common.title}</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                    {common.lines.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            {lines}
          </details>
        ) : (
          <section key={section.id} className="rounded-lg bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-950">{section.title}</h4>
            {lines}
          </section>
        );
      })}
    </div>
  );
}
export function QuoteServiceScope({ terms, quoteId }: { terms?: string | null; quoteId: string }) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  const scope = readServiceScope(terms);
  if (!scope)
    return (
      <section data-i18n-ignore="true" className="mt-4 rounded-lg border p-4">
        <h3 className="font-semibold">{t("Service details", "Détail des prestations")}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {t(
            "This quote has no saved service annex. Its recorded service lines, notes and terms are available below. If the scope is incomplete, ask OMSG for a revised quote before signing.",
            "Ce devis ne contient pas d’annexe des prestations enregistrée. Ses lignes, notes et conditions figurent ci-dessous. Si le périmètre est incomplet, demandez un devis révisé à OMSG avant de signer.",
          )}
        </p>
      </section>
    );
  return (
    <details
      id={`quote-services-${quoteId}`}
      data-i18n-ignore="true"
      className="mt-4 scroll-mt-24 rounded-xl border border-teal-200 bg-white p-4 sm:p-5"
    >
      <summary className="cursor-pointer text-base font-bold text-teal-900">
        {t(
          "View services included in each visit",
          "Voir les prestations comprises à chaque visite",
        )}
      </summary>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {t(
          "Tasks, selected extras, products, limits and quality follow-up saved with this quote. Please review them before signing.",
          "Tâches, options choisies, produits, limites et suivi qualité enregistrés avec ce devis. Consultez-les avant de signer.",
        )}
      </p>
      {scope.locale !== language && (
        <p className="mt-2 text-xs text-slate-500">
          {t(
            "The annex is shown in the language in which this quote was issued.",
            "L’annexe est affichée dans la langue d’émission de ce devis.",
          )}
        </p>
      )}
      <ScopeBody scope={scope} quoteId={quoteId} />
    </details>
  );
}
export function ServiceScopeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (body: string) => void;
}) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => (language === "fr" ? fr : en);
  return (
    <label className="block text-sm">
      {t(
        "Service annex — editable before issuing the quote",
        "Annexe des prestations — modifiable avant émission du devis",
      )}
      <p className="mt-1 text-xs text-slate-500">
        {t(
          "Keep each section heading on its own line, starting with ##. Write one task per line below it.",
          "Conservez chaque titre sur une ligne commençant par ##. Écrivez ensuite une tâche par ligne.",
        )}
      </p>
      <textarea
        aria-label={t("Full service annex", "Annexe complète des prestations")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm leading-6"
        placeholder={t(
          "## Agreed services\n- Tasks, quantities, frequency and exclusions",
          "## Prestations convenues\n- Tâches, quantités, fréquence et exclusions",
        )}
      />
    </label>
  );
}
