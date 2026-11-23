import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { dateLabel, marketSecondary, type MarketLanguage, type MarketNotice } from "./customer-model";

type Cursor = { at: string; id: string };
type Page = { unread: number; items: MarketNotice[]; has_older: boolean };
type Translate = (en: string, fr: string) => string;

export function useMarketInbox(userId: string, asProvider: boolean, expanded: boolean) {
  const client = useQueryClient();
  const [history, setHistory] = useState<Cursor[]>([]);
  const cursor = expanded ? history.at(-1) : undefined;
  const key = ["market-inbox", userId, asProvider] as const;
  const page = useQuery({
    queryKey: [...key, expanded, cursor?.at ?? null, cursor?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("market_inbox", {
        p_as_provider: asProvider, p_include_items: expanded, p_before_at: cursor?.at ?? null, p_before_id: cursor?.id ?? null,
      });
      if (error) throw error;
      return data as Page;
    },
    staleTime: 0, gcTime: 0, retry: 1, refetchInterval: 15_000, refetchIntervalInBackground: false,
  });
  async function markRead(notice: MarketNotice) {
    if (notice.read_at) return;
    const { error } = await supabase.rpc("market_read_notification", { p_id: notice.id });
    if (error) throw error;
    await client.invalidateQueries({ queryKey: key });
  }
  function older() {
    const last = page.data?.items.at(-1);
    if (page.data?.has_older && last) setHistory([...history, { at: last.created_at, id: last.id }]);
  }
  return { page, asProvider, markRead, older, newer: () => setHistory(history.slice(0, -1)), hasNewer: history.length > 0, first: () => setHistory([]) };
}

export function MarketInbox({ inbox, language, t, onOpen }: {
  inbox: ReturnType<typeof useMarketInbox>; language: MarketLanguage; t: Translate; onOpen: (notice: MarketNotice) => Promise<void>;
}) {
  const { page } = inbox;
  const [opening, setOpening] = useState(false);
  async function open(notice: MarketNotice) {
    setOpening(true);
    try { await onOpen(notice); } finally { setOpening(false); }
  }
  function label(n: MarketNotice) {
    switch (n.kind) {
      case "contact": return (n.provider_name || t("A professional", "Un professionnel")) + t(" wants to contact you", " souhaite vous contacter");
      case "message": return inbox.asProvider ? t("New message", "Nouveau message") :
        (n.provider_name || t("A professional", "Un professionnel")) + t(" sent you a message", " vous a envoyé un message");
      case "invitation": return t("A client invited you", "Un client vous a invité");
      case "match": return t("A request matches your services", "Une demande correspond à vos services");
    }
  }
  return <section aria-label={t("Notifications", "Notifications")} className="mb-5 rounded-2xl border bg-white p-5">
    <h2 className="text-lg font-bold">{t("Notifications", "Notifications")}</h2>
    {page.isPending && <p role="status" className="mt-3 text-sm">{t("Loading notifications…", "Chargement des notifications…")}</p>}
    {page.isError && <p role="alert" className="mt-3 text-sm">{t("Notifications could not be refreshed.", "Les notifications n’ont pas pu être actualisées.")} <button className="font-bold underline" onClick={() => void page.refetch()}>{t("Retry", "Réessayer")}</button></p>}
    {page.data && <>
      {!page.data.items.length && <p className="mt-3 text-sm text-slate-600">{t("No notifications on this page.", "Aucune notification sur cette page.")}</p>}
      <ul className="mt-3 grid gap-2">{page.data.items.map(n => <li key={n.id}>
        <button type="button" className={"w-full rounded-xl p-3 text-left text-sm " + (n.read_at ? "bg-slate-50" : "bg-teal-50 font-semibold")} disabled={opening} onClick={() => void open(n)}>
          <span>{label(n)} · {n.request_title}</span><time dateTime={n.created_at} className="mt-1 block text-xs text-slate-600">{dateLabel(n.created_at, language, true)}</time>
        </button>
      </li>)}</ul>
      {(inbox.hasNewer || page.data.has_older) && <nav aria-label={t("Notification pages", "Pages des notifications")} className="mt-3 flex gap-2">
        {inbox.hasNewer && <button className={marketSecondary} onClick={inbox.newer}>{t("Newer notifications", "Notifications plus récentes")}</button>}
        {page.data.has_older && <button className={marketSecondary} onClick={inbox.older}>{t("Older notifications", "Notifications plus anciennes")}</button>}
      </nav>}
    </>}
  </section>;
}
