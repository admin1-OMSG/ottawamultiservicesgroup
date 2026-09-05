import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion Instructions | Ottawa Multiservices Group" },
      { name: "description", content: "Instructions for requesting deletion of personal data associated with Ottawa Multiservices Group services and social media integrations." },
    ],
  }),
  component: DataDeletionPage,
})

function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 shadow-sm md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Ottawa Multiservices Group Inc.</p>
        <h1 className="mt-3 text-3xl font-bold">Data Deletion Instructions</h1>
        <p className="mt-5 leading-7 text-slate-600">Ottawa Multiservices Group Inc. respects your privacy. If you have interacted with us through Facebook, Messenger, Instagram, our website, or another connected service, you may request deletion of personal information associated with those interactions.</p>

        <h2 className="mt-8 text-xl font-bold">How to request deletion</h2>
        <p className="mt-3 leading-7 text-slate-600">Send your request by email to <a href="mailto:info@ottawamultiservicesgroup.com" className="font-semibold text-teal-700 underline">info@ottawamultiservicesgroup.com</a>. Use the subject line <strong>Data Deletion Request</strong>.</p>
        <p className="mt-3 leading-7 text-slate-600">Please include enough information for us to identify the relevant records, such as your name, the email address or phone number you used to contact us, and whether your interaction occurred through Facebook, Messenger, Instagram, or our website. Do not send passwords or other sensitive authentication information.</p>

        <h2 className="mt-8 text-xl font-bold">What happens next</h2>
        <p className="mt-3 leading-7 text-slate-600">We will review the request, may contact you if additional information is reasonably necessary to identify the relevant records, and delete or anonymize personal data that we are not required to retain. Information that must be retained for legal, accounting, fraud prevention, dispute resolution, or other legitimate compliance purposes may be kept for the applicable retention period.</p>

        <h2 className="mt-8 text-xl font-bold">Social media data</h2>
        <p className="mt-3 leading-7 text-slate-600">If your request concerns information received through our Facebook or Instagram integrations, please identify the platform and the account or conversation involved so we can locate the corresponding records. Deleting information stored by Ottawa Multiservices Group Inc. does not automatically delete information independently retained by Meta or another platform provider.</p>

        <h2 className="mt-8 text-xl font-bold">Contact</h2>
        <p className="mt-3 leading-7 text-slate-600">Ottawa Multiservices Group Inc.<br />Ottawa, Ontario, Canada<br />Email: <a href="mailto:info@ottawamultiservicesgroup.com" className="font-semibold text-teal-700 underline">info@ottawamultiservicesgroup.com</a><br />Phone: (613) 407-6699</p>

        <p className="mt-10 border-t pt-6 text-sm text-slate-500">Last updated: September 2, 2026</p>
      </article>
    </main>
  )
}
