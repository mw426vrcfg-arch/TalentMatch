"use client";

import { useEffect, useState } from "react";
import { loadMyStrikeStatus } from "@/app/dashboard/strike-actions";
import { useT } from "@/components/i18n/i18n-provider";
import { StarAverage } from "@/components/ratings/star-average";

export function ReputationBoard({
  userId,
  average,
  count,
  initialStrikes,
}: {
  userId: string;
  average: number | null;
  count: number;
  initialStrikes: number;
}) {
  const t = useT();
  const [strikes, setStrikes] = useState(initialStrikes);

  useEffect(() => {
    setStrikes(initialStrikes);
  }, [initialStrikes]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const status = await loadMyStrikeStatus();
      if (!cancelled) {
        setStrikes(status.count);
      }
    }

    const poll = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [userId]);

  return (
        <div className="grid gap-4 sm:grid-cols-2">
      <article className="ui-card p-5 sm:p-6">
        <p className="ui-kicker">{t("strikes.starsKicker")}</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">{t("strikes.ratingTitle")}</h2>
        <div className="mt-3">
          <StarAverage average={average} count={count} />
        </div>
      </article>
      <article className="ui-card p-5 sm:p-6">
        <p className="ui-kicker">{t("strikes.kicker")}</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">
          {t("strikes.title", { count: strikes })}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {strikes >= 3
            ? t("strikes.lockedBoard")
            : strikes === 0
              ? t("strikes.none")
              : t("strikes.warningBoard")}
        </p>
      </article>
    </div>
  );
}
