"use client";

import { notesForDisplay } from "@/lib/applications/slot-from-notes";
import { BlockCustomerButton } from "@/components/business/block-customer-button";
import { ReviewButtons } from "@/components/business/review-buttons";
import { TreatmentPassCard } from "@/components/customer/treatment-pass-card";
import { LiveRefresh } from "@/components/live-refresh";
import { useT } from "@/components/i18n/i18n-provider";
import { ScrollToId } from "@/components/ui/scroll-to-id";
import { type SalonApplication } from "@/lib/applications/queries";
import { formatSlot } from "@/lib/offers/format";
import { StarAverage } from "@/components/ratings/star-average";

export function IncomingApplications({
  applications,
  focusId,
}: {
  applications: SalonApplication[];
  focusId?: string | null;
}) {
  const t = useT();
  const imageLabels = [t("applications.front"), t("applications.back"), t("applications.side")];

  return (
    <section className="mb-12">
      <LiveRefresh intervalMs={4000} />
      <ScrollToId id={focusId ? `application-${focusId}` : null} />
      <div className="max-w-2xl">
        <p className="ui-kicker">{t("applications.incomingKicker")}</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
          {t("applications.incomingTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {t("applications.incomingIntro")}
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {applications.length === 0 ? (
          <div className="ui-empty">{t("applications.incomingEmpty")}</div>
        ) : (
          applications.map((application) => (
            <article
              key={application.id}
              id={`application-${application.id}`}
              className={`ui-card scroll-mt-28 p-5 sm:p-6 ${
                application.id === focusId ? "ui-focus-card" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {application.customer.avatar_url ? (
                    <img
                      src={application.customer.avatar_url}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-200"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 font-serif text-lg text-zinc-600">
                      {application.customer.full_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="ui-kicker">{application.offer_title}</p>
                    <h3 className="mt-2 font-serif text-2xl text-ink">
                      {application.customer.full_name}
                    </h3>
                    <StarAverage
                      average={application.customer.rating_average}
                      count={application.customer.rating_count}
                      className="mt-1"
                      hideEmpty
                    />
                    {application.slot_start ? (
                      <p className="mt-1 text-sm text-ink-soft">
                        {t("applications.slotLabel", { slot: formatSlot(application.slot_start) })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="ui-badge">{t("status.pending")}</span>
              </div>

              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="ui-kicker">{t("common.email")}</dt>
                  <dd className="mt-1 text-ink">{application.customer.email || t("common.dash")}</dd>
                </div>
                <div>
                  <dt className="ui-kicker">{t("common.phone")}</dt>
                  <dd className="mt-1 text-ink">{application.customer.phone || t("common.dash")}</dd>
                </div>
                <div>
                  <dt className="ui-kicker">{t("applications.reliability")}</dt>
                  <dd className="mt-1 text-ink">
                    {t("applications.strikesOf", { count: application.customer.active_strikes })}
                  </dd>
                </div>
              </dl>

              {application.customer.bio ? (
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">{application.customer.bio}</p>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <div>
                  <p className="ui-kicker">{t("applications.hairImages")}</p>
                  {application.uploaded_images.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-soft">{t("common.imagesNone")}</p>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {application.uploaded_images.map((url, index) => {
                        const label = imageLabels[index] ?? t("common.imageN", { n: index + 1 });
                        return (
                          <figure key={url} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={label}
                              className="h-48 w-full object-cover"
                            />
                            <figcaption className="px-3 py-2 ui-kicker">{label}</figcaption>
                          </figure>
                        );
                      })}
                    </div>
                  )}
                </div>
                <TreatmentPassCard
                  pass={application.customer.treatment_pass}
                  hair={application.customer.hair}
                />
              </div>

              <div className="mt-6">
                <p className="ui-kicker">{t("applications.notes")}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {notesForDisplay(application.notes) || t("common.notesNone")}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <ReviewButtons applicationId={application.id} />
                <BlockCustomerButton
                  customerId={application.customer.id}
                  customerName={application.customer.full_name}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
