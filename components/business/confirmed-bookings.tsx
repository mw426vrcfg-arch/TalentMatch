"use client";

import { useActionState } from "react";
import { completeBookingAction, type CompleteBookingState } from "@/app/business/complete-actions";
import { reportNoShowAction, type NoShowState } from "@/app/business/no-show-actions";
import { type ConfirmedBooking } from "@/lib/bookings/salon-confirmed";
import { formatSlot } from "@/lib/offers/format";

const initialNoShow: NoShowState = {};
const initialComplete: CompleteBookingState = {};

export function NoShowButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(reportNoShowAction, initialNoShow);

  return (
    <div className="space-y-2">
      {state.error && (
        <p className="text-sm text-ink">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-zinc-600">{state.success}</p>
      )}
      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "No-Show wirklich melden? Der Kunde erhält einen Strike. Beim dritten Strike wird der Login gesperrt.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="booking_id" value={bookingId} />
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-danger"
        >
          {pending ? "Wird gemeldet…" : "No-Show melden"}
        </button>
      </form>
    </div>
  );
}

export function CompleteButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(completeBookingAction, initialComplete);

  return (
    <div className="space-y-2">
      {state.error && <p className="text-sm text-ink">{state.error}</p>}
      <form action={formAction}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-primary"
        >
          {pending ? "Wird abgeschlossen…" : "Termin abschliessen"}
        </button>
      </form>
    </div>
  );
}

export function ConfirmedBookings({ bookings }: { bookings: ConfirmedBooking[] }) {
  return (
    <section className="mb-12">
      <div className="max-w-2xl">
        <p className="ui-kicker">Kapitel 5 · Strike-System</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Bestätigte Termine</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Nach dem Termin schliesst du ab, damit beide Seiten bewerten können. Bei No-Show gibt es einen Strike.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {bookings.length === 0 ? (
          <div className="ui-empty">
            Keine bestätigten Termine. Nach dem Akzeptieren einer Bewerbung erscheint der Termin hier.
          </div>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="ui-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="ui-kicker">
                    {booking.offer_title}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-ink">{booking.customer_name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{formatSlot(booking.start_time)}</p>
                  <p className="text-sm text-ink-soft">{booking.customer_email}</p>
                </div>
                <span className="ui-badge">
                  confirmed
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Aktive Strikes: {booking.active_strikes} / 3
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CompleteButton bookingId={booking.id} />
                <NoShowButton bookingId={booking.id} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
