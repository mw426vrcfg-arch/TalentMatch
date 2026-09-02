import { notesForDisplay } from "@/lib/applications/slot-from-notes";
import { ReviewButtons } from "@/components/business/review-buttons";
import { LiveRefresh } from "@/components/live-refresh";
import { type SalonApplication } from "@/lib/applications/queries";
import { formatSlot } from "@/lib/offers/format";

const IMAGE_LABELS = ["Front", "Back", "Side"];

export function IncomingApplications({
  applications,
}: {
  applications: SalonApplication[];
}) {
  return (
    <section className="mb-12">
      <LiveRefresh intervalMs={4000} />
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-gold-deep">
          Phase 4 · Accept / Reject
        </p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
          Eingegangene Bewerbungen
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Prüfe Bilder, Notizen und Profil. Accept reserviert den Slot. Reject lässt ihn offen.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {applications.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-ink/15 bg-paper/70 px-6 py-10 text-sm text-ink-soft">
            Keine offenen Bewerbungen. Sobald ein Kunde sich bewirbt, erscheint die Anfrage hier.
          </div>
        ) : (
          applications.map((application) => (
            <article
              key={application.id}
              className="rounded-[2rem] border border-ink/10 bg-paper p-6 shadow-[0_16px_50px_rgba(28,23,20,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gold-deep">
                    {application.offer_title}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-ink">
                    {application.customer.full_name}
                  </h3>
                  {application.slot_start ? (
                    <p className="mt-1 text-sm text-ink-soft">
                      Slot: {formatSlot(application.slot_start)}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs uppercase tracking-wide text-gold-deep">
                  pending
                </span>
              </div>

              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">E-Mail</dt>
                  <dd className="mt-1 text-ink">{application.customer.email || "–"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">Telefon</dt>
                  <dd className="mt-1 text-ink">{application.customer.phone || "–"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">Reliability</dt>
                  <dd className="mt-1 text-ink">
                    {application.customer.active_strikes === 0
                      ? "Keine Strikes"
                      : `${application.customer.active_strikes} aktive Strikes`}
                  </dd>
                </div>
              </dl>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Hair Images</p>
                {application.uploaded_images.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">Keine Bilder hinterlegt.</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {application.uploaded_images.map((url, index) => (
                      <figure key={url} className="overflow-hidden rounded-2xl border border-ink/10 bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={IMAGE_LABELS[index] ?? `Bild ${index + 1}`}
                          className="h-48 w-full object-cover"
                        />
                        <figcaption className="px-3 py-2 text-xs uppercase tracking-wide text-ink-soft">
                          {IMAGE_LABELS[index] ?? `Bild ${index + 1}`}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Notizen</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {notesForDisplay(application.notes) || "Keine Notizen hinterlegt."}
                </p>
              </div>

              <div className="mt-6">
                <ReviewButtons applicationId={application.id} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
