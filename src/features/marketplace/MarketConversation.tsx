import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { readMarketRows } from "./market-read";
import { dateLabel, marketInput, marketPrimary } from "./customer-model";

type Message = { id: string; body: string; created_at: string; mine: boolean };
export function MarketConversation({ contactId }: { contactId: string }) {
  return <Thread key={contactId} contactId={contactId} />;
}
function Thread({ contactId }: { contactId: string }) {
  const { language } = useLanguage();
  const t = (en: string, fr: string) => language === "fr" ? fr : en;
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [reload, setReload] = useState(0);
  const [readError, setReadError] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const pending = useRef<{ body: string; id: string } | null>(null);
  const lock = useRef(false);
  const history = useRef<HTMLOListElement>(null);
  const followLatest = useRef(true);
  useEffect(() => {
    if (history.current && followLatest.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages?.length]);
  useEffect(() => {
    let cancelled = false;
    let reading = false;
    async function load() {
      if (reading) return;
      reading = true;
      try {
        const result = await readMarketRows<Message>("market_messages", { p_contact_id: contactId });
        if (!cancelled) { setMessages(result); setReadError(false); }
      } catch { if (!cancelled) setReadError(true); }
      finally { reading = false; }
    }
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 10000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [contactId, reload]);
  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || lock.current) return;
    lock.current = true; setSending(true); setSendError(false);
    try {
      if (pending.current?.body !== body) pending.current = { id: crypto.randomUUID(), body };
      const result = await supabase.rpc("market_send_message", { p_contact_id: contactId, p_id: pending.current.id, p_body: body });
      if (result.error) throw result.error;
      followLatest.current = true;
      setDraft(""); pending.current = null; setReload((n) => n + 1);
    } catch { setSendError(true); }
    finally { setSending(false); lock.current = false; }
  }
  return <section aria-label={t("Conversation","Conversation")} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <h4 className="flex items-center gap-2 font-semibold"><MessageSquare size={17}/>{t("Conversation","Conversation")}</h4>
    {readError && <p role="alert" className="mt-3 text-sm text-red-800">{t("Could not load messages.","Impossible de charger les messages.")} <button className="underline" onClick={() => setReload((n)=>n+1)}>{t("Retry","Réessayer")}</button></p>}
    {!messages && !readError && <p role="status" className="my-4 text-sm text-slate-600">{t("Loading messages…","Chargement des messages…")}</p>}
    {messages?.length===0 && <p className="my-4 text-sm text-slate-600">{t("Send the first message.","Envoyez le premier message.")}</p>}
    {!!messages?.length && <ol ref={history} onScroll={({currentTarget})=>{followLatest.current=currentTarget.scrollHeight-currentTarget.scrollTop-currentTarget.clientHeight<30;}} aria-label={t("Message history","Historique des messages")} className="my-4 grid max-h-96 gap-3 overflow-y-auto">
      {messages.map(msg=><li key={msg.id} className={msg.mine?"ml-auto max-w-[90%] rounded-xl bg-teal-800 px-3 py-2 text-white":"mr-auto max-w-[90%] rounded-xl border bg-white px-3 py-2"}>
        <p className="whitespace-pre-wrap break-words text-sm">{msg.body}</p><time dateTime={msg.created_at} className="mt-1 block text-xs opacity-80">{msg.mine?t("You · ","Vous · "):""}{dateLabel(msg.created_at,language,true)}</time>
      </li>)}</ol>}
    <form onSubmit={send} className="mt-4"><label className="text-sm font-semibold">{t("Your message","Votre message")}<textarea required maxLength={4000} rows={2} className={marketInput} value={draft} disabled={sending} onChange={e=>setDraft(e.target.value)}/></label>
      {sendError && <p role="alert" className="my-2 text-sm text-red-800">{t("The message could not be confirmed. Try sending it again.","L’envoi n’a pas pu être confirmé. Réessayez.")}</p>}
      <button className={marketPrimary+" mt-2"} disabled={sending || !draft.trim()}><Send size={15}/>{sending?t("Sending…","Envoi…"):t("Send","Envoyer")}</button></form>
  </section>;
}
