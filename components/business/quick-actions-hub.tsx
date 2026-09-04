"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/i18n-provider";
import { type SalonQuickActions } from "@/lib/business/quick-actions";

function HubCard({
  kicker,
  value,
  hint,
  href,
  alert,
  compact = false,
}: {
  kicker: string;
  value: string;
  hint: string;
  href?: string;
  alert?: boolean;
  compact?: boolean;
}) {
  const content = (
    <article
      className={`border backdrop-blur-xl transition-all duration-300 ease-out ${
        compact
          ? "rounded-2xl px-2.5 py-2.5 shadow-[0_8px_24px_rgba(15,15,20,0.05)]"
          : "rounded-[28px] p-5 shadow-[0_18px_50px_rgba(15,15,20,0.08)]"
      } ${alert ? "border-rose/25 bg-rose/10" : "border-white/20 bg-white/60"}`}
    >
      <p className={`ui-kicker ${compact ? "truncate" : ""}`}>{kicker}</p>
      <p className={`font-serif text-ink ${compact ? "mt-1 text-lg leading-none sm:text-xl" : "mt-3 text-3xl sm:text-4xl"}`}>
        {value}
      </p>
      {compact ? null : <p className="mt-2 text-sm leading-relaxed text-ink-soft">{hint}</p>}
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

export function SalonQuickActionsHub({
  stats,
  compact = false,
}: {
  stats: SalonQuickActions;
  compact?: boolean;
}) {
  const t = useT();
  const unread = stats.unansweredChats > 0;

  return (
    <section className={compact ? "mb-3" : "mb-10"}>
      <div className="max-w-2xl">
        {compact ? null : <p className="ui-kicker">{t("quick.kicker")}</p>}
        <h2 className={`font-serif text-ink ${compact ? "text-sm sm:text-base" : "mt-3 text-3xl sm:text-4xl"}`}>
          {t("quick.title")}
        </h2>
      </div>
      <div className={compact ? "mt-2 grid grid-cols-3 gap-2" : "mt-6 grid gap-4 md:grid-cols-3"}>
        <HubCard
          compact={compact}
          kicker={t("quick.today")}
          value={String(stats.todayCount)}
          hint={
            stats.todayCount === 1
              ? t("quick.todayOne")
              : t("quick.todayMany", { count: stats.todayCount })
          }
        />
        <HubCard
          compact={compact}
          kicker={t("quick.chats")}
          value={unread ? String(stats.unansweredChats) : "0"}
          hint={unread ? t("quick.chatsWaiting") : t("quick.chatsNone")}
          href="/business/applications#meine-termine"
          alert={unread}
        />
        <HubCard
          compact={compact}
          kicker={t("quick.lastMinute")}
          value={`${stats.urgentRemaining} / ${stats.urgentLimit}`}
          hint={t("quick.remaining", {
            remaining: stats.urgentRemaining,
            limit: stats.urgentLimit,
          })}
          href="/business/offers"
        />
      </div>
    </section>
  );
}
