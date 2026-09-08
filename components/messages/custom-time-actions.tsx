"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  acceptCustomTimeAction,
  type ReviewState,
} from "@/app/business/review-actions";
import { Sheet } from "@/components/settings/apple-sheet";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";
import { type ChatMessage } from "@/lib/messages/store";

const initialState: ReviewState = {};

export function CustomTimeActions({
  applicationId,
  customTimeNotes,
  onCounterProposal,
  onConfirmed,
}: {
  applicationId: string;
  customTimeNotes: string | null;
  onCounterProposal: () => void;
  onConfirmed?: (message?: ChatMessage) => void;
}) {
  const t = useT();
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const confirmedRef = useRef(false);
  const [state, formAction, pending] = useActionState(acceptCustomTimeAction, initialState);

  useEffect(() => {
    if (!state.ok || confirmedRef.current) {
      return;
    }
    confirmedRef.current = true;
    setOpen(false);
    onConfirmed?.(state.confirmMessage);
  }, [state.ok, state.confirmMessage, onConfirmed]);

  return (
    <div className="border-t border-white/20 bg-emerald-50/70 px-4 py-4">
      <p className="ui-kicker">{t("applications.customTime")}</p>
      {customTimeNotes ? (
        <p className="mt-1 text-sm leading-relaxed text-ink">{customTimeNotes}</p>
      ) : null}
      {state.error && !open ? <p className="ui-alert-error mt-3">{localize(state.error)}</p> : null}
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary w-full">
          {t("applications.finalizeAppointment")}
        </button>
        <button type="button" onClick={onCounterProposal} className="ui-btn-secondary w-full">
          {t("applications.counterProposal")}
        </button>
      </div>
      {open ? (
        <Sheet title={t("applications.finalizeTitle")} onClose={() => setOpen(false)} lockClose={pending}>
          <p className="text-sm leading-relaxed text-ink-soft">{t("applications.finalizeIntro")}</p>
          {customTimeNotes ? (
            <p className="mt-3 rounded-2xl border border-white/40 bg-white/70 px-3 py-2 text-sm text-ink">
              {t("applications.customTime")}: {customTimeNotes}
            </p>
          ) : null}
          <form action={formAction} className="mt-5 space-y-5">
            <input type="hidden" name="application_id" value={applicationId} />
            {state.error ? <p className="ui-alert-error">{localize(state.error)}</p> : null}
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("applications.finalAgreedTime")}</span>
              <input
                required
                name="final_time"
                maxLength={300}
                defaultValue={customTimeNotes ?? ""}
                placeholder={t("applications.finalAgreedPlaceholder")}
                className="ui-input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("applications.calendarTime")}</span>
              <input required type="datetime-local" name="confirmed_start" className="ui-input" />
              <span className="mt-1.5 block text-xs text-ink-soft">{t("applications.calendarTimeHint")}</span>
            </label>
            <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary w-full">
              {pending ? <BusyLabel>{t("actions.saving")}</BusyLabel> : t("actions.save")}
            </button>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
