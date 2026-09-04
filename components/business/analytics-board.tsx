"use client";

import { useT } from "@/components/i18n/i18n-provider";
import { type SalonAnalytics } from "@/lib/business/analytics";
import { formatChf } from "@/lib/offers/format";

function StatCard({
  kicker,
  value,
  hint,
  compact = false,
}: {
  kicker: string;
  value: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <article
      className={`border border-white/20 bg-white/60 backdrop-blur-xl transition-all duration-300 ease-out ${
        compact
          ? "rounded-2xl px-2.5 py-2.5 shadow-[0_8px_24px_rgba(15,15,20,0.05)]"
          : "ui-card-hover ui-glass rounded-[28px] p-6 sm:p-7"
      }`}
    >
      <p className={`ui-kicker ${compact ? "truncate" : ""}`}>{kicker}</p>
      <p
        className={`font-serif tracking-tight text-ink ${
          compact ? "mt-1 text-lg leading-none sm:text-xl" : "mt-4 text-4xl sm:text-5xl"
        }`}
      >
        {value}
      </p>
      {compact ? null : <p className="mt-3 text-sm leading-relaxed text-ink-soft">{hint}</p>}
    </article>
  );
}

export function SalonAnalyticsBoard({
  stats,
  compact = false,
}: {
  stats: SalonAnalytics;
  compact?: boolean;
}) {
  const t = useT();

  return (
    <section className={compact ? "mb-5" : "mb-12"}>
      <div className="max-w-2xl">
        {compact ? null : <p className="ui-kicker">{t("analytics.kicker")}</p>}
        <h2 className={`font-serif text-ink ${compact ? "text-sm sm:text-base" : "mt-3 text-3xl sm:text-4xl"}`}>
          {t("analytics.title")}
        </h2>
        {compact ? null : <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("analytics.intro")}</p>}
      </div>
      <div className={compact ? "mt-2 grid grid-cols-3 gap-2" : "mt-8 grid gap-4 md:grid-cols-3"}>
        <StatCard
          compact={compact}
          kicker={t("analytics.models")}
          value={String(stats.matched_models)}
          hint={stats.matched_models === 1 ? t("analytics.modelsHintOne") : t("analytics.modelsHintMany")}
        />
        <StatCard
          compact={compact}
          kicker={t("analytics.revenue")}
          value={formatChf(stats.revenue_chf)}
          hint={t("analytics.revenueHint")}
        />
        <StatCard
          compact={compact}
          kicker={t("analytics.utilization")}
          value={`${stats.utilization_percent} %`}
          hint={
            stats.total_slots === 0
              ? t("analytics.utilizationEmpty")
              : t("analytics.utilizationHint", {
                  booked: stats.booked_slots,
                  total: stats.total_slots,
                })
          }
        />
      </div>
    </section>
  );
}
