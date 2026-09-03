"use client";

import { useActionState } from "react";
import {
  cancelAppointmentAsCustomerAction,
  cancelAppointmentAsSalonAction,
  type CancelAppointmentState,
} from "@/app/bookings/cancel-actions";
import { isLateCancellation } from "@/lib/bookings/cancel-window";

const initial: CancelAppointmentState = {};

export function CancelAppointmentButton({
  applicationId,
  startTime,
  role,
}: {
  applicationId: string;
  startTime: string;
  role: "customer" | "salon";
}) {
  const action = role === "customer" ? cancelAppointmentAsCustomerAction : cancelAppointmentAsSalonAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const late = role === "customer" && isLateCancellation(startTime);

  return (
    <div className="space-y-2">
      {state.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <form
        action={formAction}
        onSubmit={(event) => {
          const message = late
            ? "Weniger als 24 Stunden vor dem Termin: Du erhältst +1 No-Show-Strike. Trotzdem stornieren?"
            : role === "salon"
              ? "Termin stornieren? Der Slot wird wieder freigegeben und das Modell wird sofort benachrichtigt."
              : "Termin wirklich stornieren?";
          if (!window.confirm(message)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="application_id" value={applicationId} />
        <button type="submit" disabled={pending} className="ui-btn-danger">
          {pending ? "Wird storniert…" : "Termin stornieren"}
        </button>
      </form>
    </div>
  );
}
