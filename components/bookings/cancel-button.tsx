"use client";

import { useActionState, useEffect, useState } from "react";
import {
  cancelAppointmentAsCustomerAction,
  cancelAppointmentAsSalonAction,
  type CancelAppointmentState,
} from "@/app/bookings/cancel-actions";
import { Sheet } from "@/components/settings/apple-sheet";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";
import { isLateCancellation } from "@/lib/bookings/cancel-window";

const initial: CancelAppointmentState = {};

const REASONS: { value: string; key: MessageKey }[] = [
  { value: "illness", key: "booking.cancelReasonIllness" },
  { value: "conflict", key: "booking.cancelReasonConflict" },
  { value: "other", key: "booking.cancelReasonOther" },
];

export function CancelAppointmentButton({
  applicationId,
  startTime,
  role,
}: {
  applicationId: string;
  startTime: string;
  role: "customer" | "salon";
}) {
  const t = useT();
  const localize = useLocalize();
  const action = role === "customer" ? cancelAppointmentAsCustomerAction : cancelAppointmentAsSalonAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const late = role === "customer" && isLateCancellation(startTime);
  const noteRequired = reason === "other";

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setReason("");
      setNote("");
    }
  }, [state.success]);

  return (
    <div className="space-y-2">
      {state.error && !open ? <p className="text-sm text-rose">{localize(state.error)}</p> : null}
      <button type="button" className="ui-btn-danger" onClick={() => setOpen(true)}>
        {t("booking.cancelAppointment")}
      </button>

      {open ? (
        <Sheet
          title={t("booking.cancelAppointment")}
          lockClose={pending}
          onClose={() => {
            if (!pending) {
              setOpen(false);
            }
          }}
        >
          <p className="text-sm leading-relaxed text-ink">
            {role === "salon" ? t("booking.confirmCancelSalon") : t("booking.confirmCancel")}
          </p>

          {late ? (
            <p className="ui-alert-warn mt-4" role="alert">
              {t("booking.cancelLateWarning")}
            </p>
          ) : null}

          {state.error ? <p className="ui-alert-error mt-4">{localize(state.error)}</p> : null}

          <form action={formAction} className="mt-5 space-y-4">
            <input type="hidden" name="application_id" value={applicationId} />
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("booking.cancelReason")}</span>
              <select
                required
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="ui-input"
              >
                <option value="">{t("booking.cancelReasonPlaceholder")}</option>
                {REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">
                {noteRequired ? t("booking.cancelNoteRequired") : t("booking.cancelNote")}
              </span>
              <textarea
                name="note"
                required={noteRequired}
                minLength={noteRequired ? 4 : undefined}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("booking.cancelNotePlaceholder")}
                className="ui-input resize-y"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="ui-btn-secondary w-full"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {t("booking.cancelKeep")}
              </button>
              <button type="submit" disabled={pending} className="ui-btn-danger w-full">
                {pending ? t("booking.cancelling") : t("booking.cancelConfirm")}
              </button>
            </div>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
