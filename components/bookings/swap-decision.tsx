"use client";

import { useActionState } from "react";
import { resolveSlotSwapAction, type SwapState } from "@/app/bookings/swap-actions";
import { formatSlotDay, formatSlotTime } from "@/lib/offers/format";

const initial: SwapState = {};

export function SwapDecisionButtons({
  applicationId,
  requestedStart,
}: {
  applicationId: string;
  requestedStart: string | null;
}) {
  const [state, formAction, pending] = useActionState(resolveSlotSwapAction, initial);

  return (
    <div className="w-full rounded-[22px] border border-white/30 bg-white/70 p-4 backdrop-blur-md">
      <p className="ui-kicker">Verschiebung angefragt</p>
      <p className="mt-1.5 text-sm text-ink">
        {requestedStart
          ? `Wunschzeit: ${formatSlotDay(requestedStart)}, ${formatSlotTime(requestedStart)}.`
          : "Das Modell möchte den Termin verschieben."}
      </p>

      {state.error ? <p className="ui-alert-error mt-3">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-ink-soft">{state.success}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="decision" value="accept" />
          <button type="submit" disabled={pending} className="ui-btn-primary">
            {pending ? "Wird gespeichert…" : "Verschiebung akzeptieren"}
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="decision" value="reject" />
          <button type="submit" disabled={pending} className="ui-btn-secondary">
            Verschiebung ablehnen
          </button>
        </form>
      </div>
    </div>
  );
}
