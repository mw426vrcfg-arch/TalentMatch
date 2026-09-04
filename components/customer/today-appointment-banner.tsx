"use client";

import { formatSlotTime } from "@/lib/offers/format";
import { useLocale, useT } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/config";

export function TodayAppointmentBanner({
  startTime,
  region,
}: {
  startTime: string;
  region: string;
}) {
  const t = useT();
  const locale = useLocale();
  const place = region || t("appointments.yourSalon");

  return (
    <aside className="sticky top-3 z-30 mb-8 rounded-xl border border-white/20 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">{t("appointments.today")}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        {t("appointments.todayBanner", {
          time: formatSlotTime(startTime, intlLocale(locale)),
          region: place,
        })}
      </p>
    </aside>
  );
}
