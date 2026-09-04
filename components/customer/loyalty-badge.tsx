"use client";

import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";

function loyaltyLevelKey(level: string): MessageKey {
  if (level === "Gold") {
    return "loyalty.gold";
  }
  if (level === "Silber" || level === "Silver") {
    return "loyalty.silver";
  }
  return "loyalty.bronze";
}

export function LoyaltyBadge({
  level,
  points,
}: {
  level: string;
  points: number;
}) {
  const t = useT();
  const tone =
    level === "Gold"
      ? "from-amber-200/80 via-white to-amber-100/70"
      : level === "Silber"
        ? "from-zinc-200/90 via-white to-zinc-100"
        : "from-orange-200/50 via-white to-amber-50";

  return (
    <article className={`rounded-[28px] border border-white/30 bg-gradient-to-br ${tone} p-5 shadow-[0_18px_50px_rgba(15,15,20,0.08)] backdrop-blur-md sm:p-6`}>
      <p className="ui-kicker">{t("loyalty.beautyPoints")}</p>
      <p className="mt-2 font-serif text-4xl text-ink">{t(loyaltyLevelKey(level))}</p>
      <p className="mt-2 text-sm text-ink-soft">{t("loyalty.pointsHint", { points })}</p>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        {t("loyalty.vipHint")}
      </p>
    </article>
  );
}
