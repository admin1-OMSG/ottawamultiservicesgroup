import { CalendarCheck, CirclePlus, Phone, UsersRound, Zap, type LucideIcon } from "lucide-react";

type Flag = "subscriber" | "repeatCustomer" | "phoneVerified" | "urgent" | "detailsAdded";
type Props = Partial<Record<Flag, boolean>> & { t: (en: string, fr: string) => string };

const badges: { key: Flag; en: string; fr: string; icon: LucideIcon; color: string }[] = [
  { key: "urgent", en: "Urgent", fr: "Urgente", icon: Zap, color: "bg-rose-50 text-rose-800" },
  { key: "detailsAdded", en: "Details added", fr: "Précisions ajoutées", icon: CirclePlus, color: "bg-blue-50 text-blue-800" },
  { key: "subscriber", en: "Pro subscriber", fr: "Pro abonné", icon: CalendarCheck, color: "bg-violet-50 text-violet-800" },
  { key: "repeatCustomer", en: "Frequent client", fr: "Client régulier", icon: UsersRound, color: "bg-amber-50 text-amber-900" },
  { key: "phoneVerified", en: "Phone verified", fr: "Téléphone vérifié", icon: Phone, color: "bg-teal-50 text-teal-900" },
];

export function MarketBadges({ t, ...flags }: Props) {
  const visible = badges.filter(({ key }) => flags[key]);
  if (!visible.length) return null;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {visible.map(({ key, en, fr, icon: Icon, color }) => (
        <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
          <Icon aria-hidden="true" size={13} />
          {t(en, fr)}
        </span>
      ))}
    </span>
  );
}

type BadgedRequest = {
  status: string;
  urgency: string;
  phone_verified?: boolean;
  repeat_client?: boolean;
  details_updated_at?: string | null;
};

export function RequestBadges({ request, t }: { request: BadgedRequest; t: Props["t"] }) {
  return (
    <MarketBadges
      urgent={request.status === "open" && request.urgency === "asap"}
      detailsAdded={Boolean(request.details_updated_at)}
      repeatCustomer={request.repeat_client}
      phoneVerified={request.phone_verified}
      t={t}
    />
  );
}
