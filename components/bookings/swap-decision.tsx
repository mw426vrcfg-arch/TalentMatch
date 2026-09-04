"use client";

import { useActionState } from "react";
import { resolveSlotSwapAction, type SwapState } from "@/app/bookings/swap-actions";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/config";
import { formatSlotDay, formatSlotTime } from "@/lib/offers/format";

const initial: SwapState = {};

export function SwapDecisionButtons({
  applicationId,
  requestedStart,
}: {
  applicationId: string;
  requestedStart: string | null;
}) {
  const t = useT();
  const localize = useLocalize();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(resolveSlotSwapAction, initial);
  const when = requestedStart
    ? `${formatSlotDay(requestedStart, intlLocale(locale))}, ${formatSlotTime(requestedStart, intlLocale(locale))}`
    : null;

  return (
    <div className="w-full rounded-[22px] border border-white/30 bg-white/70 p-4 backdrop-blur-md">
      <p className="ui-kicker">{t("booking.swapRequested")}</p>
      <p className="mt-1.5 text-sm text-ink">
        {when ? t("booking.swapWanted", { when }) : t("booking.swapModel")}
      </p>

      {state.error ? <p className="ui-alert-error mt-3">{localize(state.error)}</p> : null}
      {state.success ? <p className="mt-3 text-sm text-ink-soft">{localize(state.success)}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="decision" value="accept" />
          <button type="submit" disabled={pending} className="ui-btn-primary">
            {pending ? t("actions.saving") : t("booking.acceptSwap")}
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="decision" value="reject" />
          <button type="submit" disabled={pending} className="ui-btn-secondary">
            {t("booking.rejectSwap")}
          </button>
        </form>
      </div>
    </div>
  );
}
