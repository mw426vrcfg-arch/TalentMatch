"use client";

import { useActionState, useState } from "react";
import {
  reportCustomerDisputeAction,
  reportSalonDisputeAction,
  type DisputeFormState,
} from "@/app/disputes/actions";

const initialState: DisputeFormState = {};

export function ReportProblemButton({
  applicationId,
  bookingId,
  reportedUserId,
  role,
}: {
  applicationId: string;
  bookingId: string | null;
  reportedUserId: string;
  role: "customer" | "salon";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    role === "customer" ? reportCustomerDisputeAction : reportSalonDisputeAction,
    initialState,
  );

  if (!reportedUserId) {
    return null;
  }

  if (state.success) {
    return <p className="mt-3 text-xs text-ink-soft">{state.success}</p>;
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ui-btn-secondary px-3 text-xs"
      >
        Problem melden
      </button>
      {open ? (
        <form
          action={formAction}
          className="mt-3 space-y-3 rounded-2xl border border-white/20 bg-white/75 p-4 shadow-[0_16px_40px_rgba(15,15,20,0.08)] backdrop-blur-md"
        >
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="booking_id" value={bookingId ?? ""} />
          <input type="hidden" name="reported_user_id" value={reportedUserId} />
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">Streitfall</p>
          <p className="text-sm text-ink">
            Beschreibe den Vorfall für den Plattform-Admin — z. B. unprofessionelle Arbeit oder unhöfliches
            Verhalten.
          </p>
          {state.error ? <p className="ui-alert-error">{state.error}</p> : null}
          <textarea
            required
            name="description"
            rows={4}
            minLength={12}
            maxLength={2000}
            placeholder={
              role === "customer"
                ? "z. B. Salon hat unprofessionell gearbeitet…"
                : "z. B. Modell war unhöflich…"
            }
            className="ui-input resize-y"
          />
          <button type="submit" disabled={pending} className="ui-btn-secondary px-4 text-xs">
            {pending ? "Wird gesendet…" : "Meldung senden"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
