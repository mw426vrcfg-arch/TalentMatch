import { LiveRefresh } from "@/components/live-refresh";
import {
  APPLICATION_STATUS_LABEL,
  applicationStatusMessage,
} from "@/lib/applications/status";
import { type CustomerApplication } from "@/lib/applications/queries";
import { formatSlot } from "@/lib/offers/format";

export function MyApplications({
  applications,
}: {
  applications: CustomerApplication[];
}) {
  return (
    <section className="mb-12">
      <LiveRefresh intervalMs={4000} />
      <div className="max-w-2xl">
        <p className="ui-kicker">Deine Bewerbungen</p>
        <h2 className="mt-3 font-serif text-3xl text-ink">Status vom Salon</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Pending, Accepted oder Rejected erscheint hier, sobald der Salon entscheidet.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {applications.length === 0 ? (
          <div className="ui-empty md:col-span-2">
            Noch keine Bewerbung. Wähle ein Angebot und bewirb dich auf einen Slot.
          </div>
        ) : (
          applications.map((application) => (
            <article
              key={application.id}
              className="ui-card p-5"
            >
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
                  {application.booking_status === "completed"
                    ? APPLICATION_STATUS_LABEL.completed
                    : application.booking_status === "confirmed"
                    ? APPLICATION_STATUS_LABEL.confirmed
                    : (APPLICATION_STATUS_LABEL[application.status] ?? application.status)}
                </span>
              </div>
              {application.identity_revealed ? (
                <div className="mt-3 space-y-1 text-sm text-ink">
                  <p className="font-medium">{application.salon_name}</p>
                  {application.salon_address ? <p>{application.salon_address}</p> : null}
                  {application.salon_phone ? <p>{application.salon_phone}</p> : null}
                  <p className="text-ink-soft">{application.region}</p>
                </div>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-ink-soft">
                  <p>{application.partner_name}</p>
                  <p>{application.region}</p>
                </div>
              )}
              {application.slot_start ? (
                <p className="mt-2 text-sm text-ink-soft">{formatSlot(application.slot_start)}</p>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed text-ink">
                {applicationStatusMessage(application.status, application.booking_status)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
