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
        <p className="text-xs uppercase tracking-[0.24em] text-gold-deep">Deine Bewerbungen</p>
        <h2 className="mt-3 font-serif text-3xl text-ink">Status vom Salon</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Pending, Accepted oder Rejected erscheint hier, sobald der Salon entscheidet.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {applications.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-ink/15 bg-paper/70 px-6 py-10 text-sm text-ink-soft md:col-span-2">
            Noch keine Bewerbung. Wähle ein Angebot und bewirb dich auf einen Slot.
          </div>
        ) : (
          applications.map((application) => (
            <article
              key={application.id}
              className="rounded-[1.75rem] border border-ink/10 bg-paper p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-2xl text-ink">{application.offer_title}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
                    application.booking_status === "confirmed" || application.status === "accepted"
                      ? "bg-gold/20 text-gold-deep"
                      : application.status === "rejected"
                        ? "bg-rose/20 text-ink"
                        : "bg-cream text-ink-soft"
                  }`}
                >
                  {application.booking_status === "confirmed"
                    ? APPLICATION_STATUS_LABEL.confirmed
                    : (APPLICATION_STATUS_LABEL[application.status] ?? application.status)}
                </span>
              </div>
              {application.salon_name ? (
                <p className="mt-2 text-sm text-ink-soft">{application.salon_name}</p>
              ) : null}
              {application.slot_start ? (
                <p className="mt-2 text-sm text-ink-soft">{formatSlot(application.slot_start)}</p>
              ) : null}
              {application.location ? (
                <p className="text-sm text-ink-soft">{application.location}</p>
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
