"use client";

import { useActionState } from "react";
import { acceptCustomTimeAction, type ReviewState } from "@/app/business/review-actions";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";

const initialState: ReviewState = {};

export function CustomTimeActions({
  applicationId,
  customTimeNotes,
  onCounterProposal,
}: {
  applicationId: string;
  customTimeNotes: string | null;
  onCounterProposal: () => void;
}) {
  const t = useT();
  const localize = useLocalize();
  const [state, formAction, pending] = useActionState(acceptCustomTimeAction, initialState);

  return (
    <div className="border-t border-white/20 bg-white/40 px-4 py-4">
      <p className="ui-kicker">{t("applications.customTime")}</p>
      {customTimeNotes ? (
        <p className="mt-1 text-sm leading-relaxed text-ink">{customTimeNotes}</p>
      ) : null}
      {state.error ? <p className="ui-alert-error mt-3">{localize(state.error)}</p> : null}
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="application_id" value={applicationId} />
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("applications.confirmExactTime")}</span>
          <input required type="datetime-local" name="confirmed_start" className="ui-input" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary">
            {pending ? <BusyLabel>{t("common.sending")}</BusyLabel> : t("applications.acceptCustomTime")}
          </button>
          <button type="button" onClick={onCounterProposal} className="ui-btn-secondary">
            {t("applications.counterProposal")}
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-ink-soft">{t("applications.customTimeChatHint")}</p>
    </div>
  );
}
