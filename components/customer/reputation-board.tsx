"use client";

import { useEffect, useState } from "react";
import { loadMyStrikeStatus } from "@/app/dashboard/strike-actions";
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
        <p className="ui-kicker">Sterne</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">Dein Rating</h2>
        <div className="mt-3">
          <StarAverage average={average} count={count} />
        </div>
      </article>
      <article className="ui-card p-5 sm:p-6">
        <p className="ui-kicker">No-Show Schutz</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">
          {strikes} von 3 Strikes erhalten
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {strikes >= 3
            ? "Konto gesperrt nach drei No-Shows. Strikes verjähren nach 6 Monaten."
            : strikes === 0
              ? "Keine aktiven Strikes. So bleibt der Zugang offen."
              : "Beim dritten Strike wird der Login gesperrt. Aktive Strikes verjähren nach 6 Monaten."}
        </p>
      </article>
    </div>
  );
}
