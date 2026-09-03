import Link from "next/link";
import { type SalonQuickActions } from "@/lib/business/quick-actions";

function HubCard({
  kicker,
  value,
  hint,
  href,
  alert,
}: {
  kicker: string;
  value: string;
  hint: string;
  href?: string;
  alert?: boolean;
}) {
  const content = (
    <article
      className={`rounded-[28px] border p-5 shadow-[0_18px_50px_rgba(15,15,20,0.08)] backdrop-blur-md ${
        alert
          ? "border-rose/25 bg-rose/10"
          : "border-white/20 bg-white/70"
      }`}
    >
      <p className="ui-kicker">{kicker}</p>
      <p className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{hint}</p>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block transition duration-300 hover:scale-[1.01]">
      {content}
    </Link>
  );
}

export function SalonQuickActionsHub({ stats }: { stats: SalonQuickActions }) {
  const unread = stats.unansweredChats > 0;

  return (
    <section className="mb-10">
      <div className="max-w-2xl">
        <p className="ui-kicker">Kapitel 3.2 · Quick Actions</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Heute im Blick</h2>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <HubCard
          kicker="Heutige Termine"
          value={String(stats.todayCount)}
          hint={
            stats.todayCount === 1
              ? "1 bestätigter Termin heute."
              : `${stats.todayCount} bestätigte Termine heute.`
          }
        />
        <HubCard
          kicker="Ungelesene Chats"
          value={unread ? String(stats.unansweredChats) : "0"}
          hint={unread ? "Modelle warten auf deine Antwort." : "Keine unbeantworteten Chats."}
          href="/business/dashboard"
          alert={unread}
        />
        <HubCard
          kicker="Last-Minute-Deals"
          value={`${stats.urgentRemaining} von ${stats.urgentLimit}`}
          hint={`${stats.urgentRemaining} von ${stats.urgentLimit} verbleibend in diesem Monat.`}
          href="/business/offers"
        />
      </div>
    </section>
  );
}
