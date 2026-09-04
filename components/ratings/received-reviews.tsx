"use client";

import { type ReceivedReview } from "@/lib/ratings/store";
import { useLocale, useT } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/config";

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function ReceivedReviews({ reviews }: { reviews: ReceivedReview[] }) {
  const t = useT();
  const locale = useLocale();

  return (
    <section className="mt-10">
      <p className="ui-kicker">{t("rating.receivedKicker")}</p>
      <h2 className="mt-2 font-serif text-3xl text-ink">{t("rating.receivedTitle")}</h2>
      {reviews.length === 0 ? (
        <div className="ui-empty mt-4">{t("rating.empty")}</div>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="ui-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">{review.from_name}</p>
                <p className="text-sm text-ink">⭐ {review.rating.toFixed(1)}</p>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{formatWhen(review.created_at, intlLocale(locale))}</p>
              {review.comment ? (
                <p className="mt-3 text-sm leading-relaxed text-ink">{review.comment}</p>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">{t("rating.noText")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
