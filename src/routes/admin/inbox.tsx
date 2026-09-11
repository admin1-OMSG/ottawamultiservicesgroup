import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { Facebook, Instagram, MessageCircleMore, RefreshCw, Search, UserRound } from "lucide-react"
import { PageHeader } from "@/components/admin/PageHeader"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/inbox")({ component: InboxPage })

type Conversation = {
  id: string
  platform: "facebook" | "instagram"
  external_user_id: string
  contact_name: string | null
  contact_username: string | null
  status: "new" | "open" | "waiting" | "qualified" | "closed" | "spam"
  unread_count: number
  last_message_preview: string | null
  last_message_at: string | null
  customer_id: string | null
  service_request_id: string | null
  contact_email: string | null
  contact_phone: string | null
  requested_service: string | null
  pickup_address: string | null
  destination_address: string | null
  requested_date: string | null
  quote_notes: string | null
}

type Message = {
  id: string
  conversation_id: string
  platform: "facebook" | "instagram"
  direction: "inbound" | "outbound"
  message_type: string
  text_body: string | null
  attachment_url: string | null
  sent_at: string
}

const statuses = ["new", "open", "waiting", "qualified", "closed", "spam"] as const

function InboxPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [platform, setPlatform] = useState<"all" | "facebook" | "instagram">("all")
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState("")
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [quoteSaving, setQuoteSaving] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    service_name: "",
    pickup_address: "",
    destination_address: "",
    preferred_date: "",
    notes: "",
  })

  useEffect(() => { void loadConversations() }, [])
  useEffect(() => {
    if (selectedId) void loadMessages(selectedId)
    else setMessages([])
  }, [selectedId])

  async function loadConversations() {
    setLoading(true)
    setError("")
    try {
      if (!(await requireActiveAdmin())) {
        await navigate({ to: "/admin/login" })
        return
      }
      const { data, error } = await supabase
        .from("social_inbox_summary")
        .select("id,platform,external_user_id,contact_name,contact_username,status,unread_count,last_message_preview,last_message_at,customer_id,service_request_id,contact_email,contact_phone,requested_service,pickup_address,destination_address,requested_date,quote_notes")
        .order("last_message_at", { ascending: false, nullsFirst: false })
      if (error) {
  console.error("INBOX SUPABASE ERROR:", error)
  throw new Error(error.message)
}
      const items = (data ?? []) as Conversation[]
      setRows(items)
      if (!selectedId && items.length) setSelectedId(items[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load inbox.")
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(conversationId: string) {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from("social_messages")
        .select("id,conversation_id,platform,direction,message_type,text_body,attachment_url,sent_at")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true })
      if (error) throw error
      setMessages((data ?? []) as Message[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load conversation.")
    } finally {
      setLoadingMessages(false)
    }
  }

  async function selectConversation(id: string) {
    setSelectedId(id)
    const current = rows.find((x) => x.id === id)
    if (!current || current.unread_count === 0) return
    const { error } = await supabase
      .from("social_conversations")
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (!error) {
      setRows((items) => items.map((x) => x.id === id ? { ...x, unread_count: 0 } : x))
    }
  }

  async function updateStatus(status: Conversation["status"]) {
    if (!selectedId) return
    const { error } = await supabase
      .from("social_conversations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", selectedId)
    if (error) {
      setError(error.message)
      return
    }
    setRows((items) => items.map((x) => x.id === selectedId ? { ...x, status } : x))
  }


  function openQuoteRequest() {
    if (!selected || selected.service_request_id) return

    const displayName =
      selected.contact_name ||
      selected.contact_username ||
      ""

    const parts = displayName.trim().split(/\s+/).filter(Boolean)
    const firstName = parts.shift() || ""
    const lastName = parts.join(" ")

    setQuoteForm({
      first_name: firstName,
      last_name: lastName,
      email: selected.contact_email || "",
      phone: selected.contact_phone || "",
      service_name: selected.requested_service || "",
      pickup_address: selected.pickup_address || "",
      destination_address: selected.destination_address || "",
      preferred_date: selected.requested_date || "",
      notes: selected.quote_notes || selected.last_message_preview || "",
    })
    setQuoteOpen(true)
  }
async function sendReply() {
  if (!selectedId) return

  const message = replyText.trim()
  if (!message) return

  setSendingReply(true)
  setError("")

  try {
    const { data, error } = await supabase.functions.invoke(
      "send-meta-message",
      {
        body: {
          conversationId: selectedId,
          message,
        },
      },
    )

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    setReplyText("")

    await loadMessages(selectedId)
    await loadConversations()
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "Unable to send message.",
    )
  } finally {
    setSendingReply(false)
  }
}
  async function createQuoteRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || selected.service_request_id) return

    if (!quoteForm.first_name.trim()) {
      setError("First name is required.")
      return
    }
    if (!quoteForm.email.trim()) {
      setError("Email is required to create a quote request.")
      return
    }

    setQuoteSaving(true)
    setError("")

    try {
      const user = await requireActiveAdmin()
      if (!user) return

      const questionnaireAnswers = {
        source_platform: selected.platform,
        social_conversation_id: selected.id,
        destination_address: quoteForm.destination_address.trim() || null,
      }

      const { data: request, error: requestError } = await supabase
        .from("service_requests")
        .insert({
          first_name: quoteForm.first_name.trim(),
          last_name: quoteForm.last_name.trim() || null,
          email: quoteForm.email.trim().toLowerCase(),
          phone: quoteForm.phone.trim() || null,
          address_line: quoteForm.pickup_address.trim() || null,
          province: "Ontario",
          service_name: quoteForm.service_name.trim() || null,
          preferred_date: quoteForm.preferred_date || null,
          description: quoteForm.notes.trim() || null,
          questionnaire_answers: questionnaireAnswers,
          status: "new",
          source: selected.platform,
          internal_notes: `Created from ${selected.platform} Inbox conversation.`,
        })
        .select("id,request_number,customer_id")
        .single()

      if (requestError) throw requestError

      const { error: conversationError } = await supabase
        .from("social_conversations")
        .update({
          service_request_id: request.id,
          customer_id: request.customer_id || selected.customer_id,
          contact_email: quoteForm.email.trim().toLowerCase(),
          contact_phone: quoteForm.phone.trim() || null,
          requested_service: quoteForm.service_name.trim() || null,
          pickup_address: quoteForm.pickup_address.trim() || null,
          destination_address: quoteForm.destination_address.trim() || null,
          requested_date: quoteForm.preferred_date || null,
          quote_notes: quoteForm.notes.trim() || null,
          status: "qualified",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id)

      if (conversationError) throw conversationError

      setRows((items) =>
        items.map((x) =>
          x.id === selected.id
            ? {
                ...x,
                service_request_id: request.id,
                customer_id: request.customer_id || x.customer_id,
                contact_email: quoteForm.email.trim().toLowerCase(),
                contact_phone: quoteForm.phone.trim() || null,
                requested_service: quoteForm.service_name.trim() || null,
                pickup_address: quoteForm.pickup_address.trim() || null,
                destination_address: quoteForm.destination_address.trim() || null,
                requested_date: quoteForm.preferred_date || null,
                quote_notes: quoteForm.notes.trim() || null,
                status: "qualified",
              }
            : x,
        ),
      )

      setQuoteOpen(false)
      await navigate({
        to: "/admin/quotes/$requestId",
        params: { requestId: request.id },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create quote request.")
    } finally {
      setQuoteSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((x) => {
      const p = platform === "all" || x.platform === platform
      const text = [x.contact_name, x.contact_username, x.external_user_id, x.last_message_preview]
        .filter(Boolean).join(" ").toLowerCase()
      return p && (!q || text.includes(q))
    })
  }, [rows, query, platform])

  const selected = rows.find((x) => x.id === selectedId) ?? null
  const unread = rows.reduce((sum, x) => sum + Number(x.unread_count || 0), 0)
  const fbCount = rows.filter((x) => x.platform === "facebook").length
  const igCount = rows.filter((x) => x.platform === "instagram").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Facebook Messenger and Instagram conversations in one place."
        action={
          <button onClick={() => void loadConversations()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 font-semibold">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Unread messages" value={String(unread)} icon={<MessageCircleMore className="h-5 w-5" />} />
        <Metric label="Facebook conversations" value={String(fbCount)} icon={<Facebook className="h-5 w-5" />} />
        <Metric label="Instagram conversations" value={String(igCount)} icon={<Instagram className="h-5 w-5" />} />
      </section>

      <section className="grid min-h-[650px] overflow-hidden rounded-xl border bg-white shadow-sm lg:grid-cols-[360px_1fr]">
        <aside className="border-r">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <FilterButton active={platform === "all"} onClick={() => setPlatform("all")}>All</FilterButton>
              <FilterButton active={platform === "facebook"} onClick={() => setPlatform("facebook")}>Facebook</FilterButton>
              <FilterButton active={platform === "instagram"} onClick={() => setPlatform("instagram")}>Instagram</FilterButton>
            </div>
          </div>

          <div className="max-h-[650px] overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-slate-500">Loading inbox...</p>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageCircleMore className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-medium">No conversations yet</p>
                <p className="mt-1 text-xs">Messages will appear here after Meta access is active.</p>
              </div>
            ) : filtered.map((c) => (
              <button key={c.id} onClick={() => void selectConversation(c.id)} className={`w-full border-b p-4 text-left ${selectedId === c.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-slate-100 p-2">
                    {c.platform === "facebook" ? <Facebook className="h-4 w-4 text-blue-700" /> : <Instagram className="h-4 w-4 text-fuchsia-700" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{c.contact_name || c.contact_username || `User ${c.external_user_id.slice(-6)}`}</p>
                      {c.unread_count > 0 && <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-bold text-white">{c.unread_count}</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">{c.last_message_preview || "No message preview"}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span className="capitalize">{c.status}</span>
                      <span>{formatRelative(c.last_message_at)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center text-slate-500">
              <div><MessageCircleMore className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-semibold">Select a conversation</p></div>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-slate-100 p-2"><UserRound className="h-5 w-5 text-slate-600" /></div>
                  <div>
                    <p className="font-bold">{selected.contact_name || selected.contact_username || `User ${selected.external_user_id.slice(-6)}`}</p>
                    <p className="text-xs text-slate-500">{selected.platform === "facebook" ? "Facebook Messenger" : "Instagram Direct"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={selected.status} onChange={(e) => void updateStatus(e.target.value as Conversation["status"])} className="rounded-lg border bg-white px-3 py-2 text-sm">
                    {statuses.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  {selected.service_request_id ? (
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: "/admin/quotes/$requestId",
                          params: { requestId: selected.service_request_id! },
                        })
                      }
                      className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800"
                    >
                      Open Quote Request
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openQuoteRequest}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Create Quote Request
                    </button>
                  )}
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
                {loadingMessages ? (
                  <p className="text-center text-sm text-slate-500">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No messages stored for this conversation.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${m.direction === "outbound" ? "bg-teal-600 text-white" : "border bg-white text-slate-900"}`}>
                          {m.text_body && <p className="whitespace-pre-wrap text-sm">{m.text_body}</p>}
                          {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs underline">Open attachment</a>}
                          {!m.text_body && !m.attachment_url && <p className="text-sm italic">[{m.message_type}]</p>}
                          <p className="mt-1 text-[11px] opacity-70">{formatDateTime(m.sent_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <footer className="border-t bg-white p-4">
  <div className="flex gap-2">
    <input
      type="text"
      value={replyText}
      onChange={(e) => setReplyText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          void sendReply()
        }
      }}
      placeholder="Write a reply..."
      disabled={sendingReply}
      className="flex-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
    />

    <button
      type="button"
      onClick={() => void sendReply()}
      disabled={sendingReply || !replyText.trim()}
      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {sendingReply ? "Sending..." : "Send"}
    </button>
  </div>
</footer>
            </>
          )}
        </main>
      </section>

      {quoteOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={createQuoteRequest}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Inbox → Quote Request
                </p>
                <h2 className="mt-1 text-xl font-bold">Create Quote Request</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The new request will remain linked to this {selected.platform} conversation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="First name *">
                <input
                  required
                  value={quoteForm.first_name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, first_name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Last name">
                <input
                  value={quoteForm.last_name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, last_name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Email *">
                <input
                  required
                  type="email"
                  value={quoteForm.email}
                  onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Phone">
                <input
                  value={quoteForm.phone}
                  onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Service">
                <input
                  value={quoteForm.service_name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, service_name: e.target.value })}
                  placeholder="Moving, Cleaning, Snow Removal..."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Preferred date">
                <input
                  type="date"
                  value={quoteForm.preferred_date}
                  onChange={(e) => setQuoteForm({ ...quoteForm, preferred_date: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Pickup / service address">
                <input
                  value={quoteForm.pickup_address}
                  onChange={(e) => setQuoteForm({ ...quoteForm, pickup_address: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Destination (if applicable)">
                <input
                  value={quoteForm.destination_address}
                  onChange={(e) => setQuoteForm({ ...quoteForm, destination_address: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Notes / details">
                  <textarea
                    rows={5}
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Items, stairs/elevator, photos requested, customer details..."
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
              After creation, the conversation will be marked <b>Qualified</b> and linked to the
              new Quote Request.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuoteOpen(false)}
                className="rounded-lg border px-4 py-2 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={quoteSaving}
                className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {quoteSaving ? "Creating..." : "Create Quote Request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <article className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="text-teal-600">{icon}</span></div><p className="mt-2 text-2xl font-bold">{value}</p></article>
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-teal-600 text-white" : "border bg-white text-slate-600"}`}>{children}</button>
}

function formatRelative(value: string | null) {
  if (!value) return "—"
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (diff < 1) return "now"
  if (diff < 60) return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}
