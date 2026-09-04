"use client";

import { useT } from "@/components/i18n/i18n-provider";

export function StarAverage({
  average,
  count,
  className = "",
  hideEmpty = false,
}: {
  average: number | null;
  count: number;
  className?: string;
  hideEmpty?: boolean;
}) {
  const t = useT();
  if (!count || average == null) {
    if (hideEmpty) {
      return null;
    }
    return (
      <p className={`text-sm text-ink-soft ${className}`.trim()}>{t("rating.noRatings")}</p>
    );
  }

  return (
    <p className={`text-sm font-medium text-ink ${className}`.trim()}>
      ⭐ {average.toFixed(1)}
      <span className="ml-1 font-normal text-ink-soft">
        ({count} {count === 1 ? t("rating.oneReview") : t("rating.manyReviews")})
      </span>
    </p>
  );
}
