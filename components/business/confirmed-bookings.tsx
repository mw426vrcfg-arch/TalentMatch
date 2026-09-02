"use client";

import { useActionState } from "react";
import { reportNoShowAction, type NoShowState } from "@/app/business/no-show-actions";
import { type ConfirmedBooking } from "@/lib/bookings/salon-confirmed";
import { formatSlot } from "@/lib/offers/format";

const initialState: NoShowState = {};

function NoShowButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(reportNoShowAction, initialState);

  return (
    <div className="mt-3 space-y-2">
      {state.error && (
        <p className="text-sm text-ink">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-gold-deep">{state.success}</p>
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
          className="rounded-full border border-rose/40 bg-rose/10 px-4 py-2 text-sm text-ink transition hover:border-rose disabled:opacity-60"
        >
          {pending ? "Wird gemeldet…" : "No-Show melden"}
        </button>
      </form>
    </div>
  );
}

export function ConfirmedBookings({ bookings }: { bookings: ConfirmedBooking[] }) {
  return (
    <section className="mb-12">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-gold-deep">Kapitel 5 · Strike-System</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Bestätigte Termine</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Erscheint der Kunde nicht, meldest du einen No-Show. Drei aktive Strikes sperren den Login.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {bookings.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-ink/15 bg-paper/70 px-6 py-10 text-sm text-ink-soft">
            Keine bestätigten Termine. Nach dem Akzeptieren einer Bewerbung erscheint der Termin hier.
          </div>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-[1.75rem] border border-ink/10 bg-paper p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gold-deep">
                    {booking.offer_title}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-ink">{booking.customer_name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{formatSlot(booking.start_time)}</p>
                  <p className="text-sm text-ink-soft">{booking.customer_email}</p>
                </div>
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs uppercase tracking-wide text-gold-deep">
                  confirmed
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Aktive Strikes: {booking.active_strikes} / 3
              </p>
              <NoShowButton bookingId={booking.id} />
            </article>
          ))
        )}
      </div>
    </section>
  );
}
