"use client";

import { useLocale, useT } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/messages";
import type { MemberLevel } from "@/lib/loyalty/levels";
import { loyaltyProgress } from "@/lib/loyalty/progress";

function loyaltyLevelKey(level: MemberLevel | string): MessageKey {
  if (level === "Platin") {
    return "loyalty.platinum";
  }
  if (level === "Gold") {
    return "loyalty.gold";
  }
  if (level === "Silber" || level === "Silver") {
    return "loyalty.silver";
  }
  return "loyalty.bronze";
}

function tone(level: MemberLevel) {
  if (level === "Platin") {
    return {
      card: "from-slate-100/90 via-white to-cyan-50/80",
      bar: "from-slate-300 via-white to-cyan-200",
      glow: "bg-cyan-200/50",
      fillGlow: "rgba(125, 211, 252, 0.45)",
    };
  }
  if (level === "Gold") {
    return {
      card: "from-amber-200/80 via-white to-amber-100/70",
      bar: "from-amber-500 via-yellow-300 to-amber-200",
      glow: "bg-amber-200/60",
      fillGlow: "rgba(245, 158, 11, 0.4)",
    };
  }
  if (level === "Silber") {
    return {
      card: "from-zinc-200/90 via-white to-zinc-100",
      bar: "from-zinc-500 via-zinc-200 to-slate-100",
      glow: "bg-zinc-200/70",
      fillGlow: "rgba(161, 161, 170, 0.45)",
    };
  }
  return {
    card: "from-orange-200/55 via-white to-amber-50",
    bar: "from-amber-800 via-orange-400 to-amber-300",
    glow: "bg-orange-200/50",
    fillGlow: "rgba(217, 119, 6, 0.38)",
  };
}

export function LoyaltyBadge({
  points,
}: {
  level?: string;
  points: number;
}) {
  const t = useT();
  const locale = useLocale();
  const progress = loyaltyProgress(points);
  const resolvedLevel = progress.level;
  const palette = tone(resolvedLevel);
  const format = (value: number) => value.toLocaleString(intlLocale(locale));
  const nextLabel = progress.nextLevel ? t(loyaltyLevelKey(progress.nextLevel)) : "";

  return (
    <article
      className={`relative overflow-hidden rounded-[28px] border border-white/30 bg-gradient-to-br ${palette.card} p-5 shadow-[0_18px_50px_rgba(15,15,20,0.08)] backdrop-blur-md sm:p-6`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full ${palette.glow} blur-3xl`} />
      <p className="ui-kicker">{t("loyalty.beautyPoints")}</p>
      <p className="mt-2 font-serif text-4xl text-ink">{t(loyaltyLevelKey(resolvedLevel))}</p>
      {progress.maxed ? (
        <p className="mt-2 text-sm text-ink-soft">{t("loyalty.pointsTotal", { points: format(progress.points) })}</p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          {t("loyalty.progress", { current: format(progress.points), target: format(progress.target) })}
        </p>
      )}

      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-900/10 ring-1 ring-white/50"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={Math.min(progress.points, progress.target)}
        aria-label={t("loyalty.beautyPoints")}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${palette.bar} transition-[width] duration-700 ease-out`}
          style={{
            width: `${progress.ratio * 100}%`,
            boxShadow: progress.ratio > 0 ? `0 0 18px ${palette.fillGlow}` : undefined,
          }}
        />
      </div>

      <p className="mt-3 text-sm font-medium text-ink">
        {progress.maxed
          ? t("loyalty.maxed")
          : t("loyalty.remaining", { remaining: format(progress.remaining), next: nextLabel })}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">{t("loyalty.vipHint")}</p>
    </article>
  );
}
