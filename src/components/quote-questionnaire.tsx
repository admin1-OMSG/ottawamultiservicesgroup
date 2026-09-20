import {
  questionnaireLocale,
  questionnaireSections,
} from "../../supabase/functions/_shared/quote-questionnaire";

export function QuoteQuestionnaire({ answers }: { answers: Record<string, unknown> | null }) {
  const locale = questionnaireLocale(answers);
  const sections = questionnaireSections(answers, locale);
  return (
    <section data-i18n-ignore="true" className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        {locale === "fr" ? "Détails de la demande" : "Request details"}
      </h2>
      {sections.length === 0 ? (
        <p className="mt-4 text-slate-500">
          {locale === "fr" ? "Aucune réponse complémentaire." : "No additional responses."}
        </p>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="mt-6 border-t pt-5">
            <h3 className="font-semibold text-teal-800">{section.title}</h3>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className={row.value.includes("\n") ? "min-w-0 sm:col-span-2" : "min-w-0"}
                >
                  <dt className="text-sm text-slate-500">{row.label}</dt>
                  <dd className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-900">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))
      )}
    </section>
  );
}
