"use client";

import { LiveRefresh } from "@/components/live-refresh";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";
import { type CustomerApplication } from "@/lib/applications/queries";
import { formatSlot } from "@/lib/offers/format";
import { intlLocale } from "@/lib/i18n/config";
import { useLocale } from "@/components/i18n/i18n-provider";

function statusKey(status: string): MessageKey {
  if (status === "accepted" || status === "confirmed") {
    return "status.accepted";
  }
  if (status === "rejected") {
    return "status.rejected";
  }
  if (status === "completed") {
    return "status.completed";
  }
  if (status === "cancelled_by_customer" || status === "cancelled_by_salon" || status === "cancelled") {
    return "status.cancelled";
  }
  if (status === "swap_requested") {
    return "status.swap_requested";
  }
  return "status.pending";
}

function statusMessageKey(status: string, bookingStatus?: string | null): MessageKey {
  if (bookingStatus === "completed") {
    return "statusMessage.completed";
  }
  if (bookingStatus === "confirmed" || status === "accepted") {
    return "statusMessage.accepted";
  }
  if (status === "cancelled_by_customer" || status === "cancelled_by_salon" || bookingStatus === "cancelled") {
    return "statusMessage.cancelled";
  }
  if (status === "rejected") {
    return "statusMessage.rejected";
  }
  return "statusMessage.pending";
}

export function MyApplications({
  applications,
}: {
  applications: CustomerApplication[];
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <section className="mb-12">
      <LiveRefresh intervalMs={4000} />
      <div className="max-w-2xl">
        <p className="ui-kicker">{t("applications.kicker")}</p>
        <h2 className="mt-3 font-serif text-3xl text-ink">{t("applications.title")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t("applications.intro")}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {applications.length === 0 ? (
          <div className="ui-empty md:col-span-2">{t("applications.empty")}</div>
        ) : (
          applications.map((application) => {
            const badgeStatus =
              application.booking_status === "completed"
                ? "completed"
                : application.booking_status === "confirmed"
                  ? "confirmed"
                  : application.status;
            return (
              <article key={application.id} className="ui-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-2xl text-ink">{application.offer_title}</h3>
                  <span
                    className={`ui-badge shrink-0 ${
                      application.booking_status === "confirmed" || application.status === "accepted"
                        ? "bg-zinc-900 text-cream"
                        : application.status === "rejected"
                          ? "bg-rose/10 text-rose"
                          : ""
                    }`}
                  >
                    {t(statusKey(badgeStatus))}
                  </span>
                </div>
                {application.identity_revealed ? (
                  <div className="mt-3 space-y-1 text-sm text-ink">
                    <p className="font-medium">{application.salon_name}</p>
                    {application.salon_address ? <p>{application.salon_address}</p> : null}
                    {application.salon_phone ? <p>{application.salon_phone}</p> : null}
                    <p className="text-ink-soft">
                      <LocalizedText text={application.region} />
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1 text-sm text-ink-soft">
                    <p>{application.partner_name}</p>
                    <p>
                      <LocalizedText text={application.region} />
                    </p>
                  </div>
                )}
                {application.slot_start ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    {formatSlot(application.slot_start, intlLocale(locale))}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-ink">
                  {t(statusMessageKey(application.status, application.booking_status))}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
