"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  loadSwapSlotsAction,
  requestSlotSwapAction,
  type SwapState,
} from "@/app/bookings/swap-actions";
import { type SwapSlot } from "@/lib/bookings/swap";
import { choiceChipClass } from "@/components/hair/choice-chip";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";
import { Skeleton, SkeletonChips } from "@/components/ui/skeleton";
import { intlLocale } from "@/lib/i18n/config";
import { formatSlotDay, formatSlotTime } from "@/lib/offers/format";

const initial: SwapState = {};

export function SwapRequestButton({ applicationId }: { applicationId: string }) {
  const t = useT();
  const localize = useLocalize();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<SwapSlot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [loading, startLoading] = useTransition();
  const [state, formAction, pending] = useActionState(requestSlotSwapAction, initial);

  useEffect(() => {
    if (!open) {
      return;
    }
    startLoading(async () => {
      const result = await loadSwapSlotsAction(applicationId);
      setSlots(result.slots);
      setSelected(result.slots[0]?.id ?? "");
      setLoadError(result.error ?? null);
    });
  }, [open, applicationId]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  if (!open) {
    return (
      <div className="space-y-2">
        {state.success ? <p className="text-sm text-ink-soft">{localize(state.success)}</p> : null}
        <button type="button" onClick={() => setOpen(true)} className="ui-btn-secondary">
          {t("booking.requestSwap")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[22px] border border-white/30 bg-white/70 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">{t("booking.changeTime")}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {t("booking.changeTimeIntro")}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="ui-btn-secondary px-3 text-xs">
          {t("booking.close")}
        </button>
      </div>

      {state.error ? <p className="ui-alert-error mt-3">{localize(state.error)}</p> : null}
      {loadError ? <p className="ui-alert-error mt-3">{localize(loadError)}</p> : null}

      {loading ? (
        <div className="mt-4 space-y-3">
          <SkeletonChips count={4} />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      ) : slots.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          {t("booking.noOtherSlots")}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="requested_slot_id" value={selected} />
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelected(slot.id)}
                className={choiceChipClass(selected === slot.id)}
              >
                {formatSlotDay(slot.start_time, intlLocale(locale))} · {formatSlotTime(slot.start_time, intlLocale(locale))}
              </button>
            ))}
          </div>
          <button type="submit" disabled={pending || !selected} className="ui-btn-primary">
            {pending ? t("booking.sending") : t("booking.sendRequest")}
          </button>
        </form>
      )}
    </div>
  );
}

export function SwapPendingNote({ requestedStart }: { requestedStart: string | null }) {
  const t = useT();
  const locale = useLocale();
  const when = requestedStart
    ? `${formatSlotDay(requestedStart, intlLocale(locale))}, ${formatSlotTime(requestedStart, intlLocale(locale))}`
    : null;

  return (
    <p className="w-full rounded-[22px] border border-white/30 bg-white/70 px-4 py-3 text-sm text-ink-soft backdrop-blur-md">
      {t("booking.pendingSwap")}
      {when ? ` · ${when}.` : "."} {t("booking.pendingSwapNote")}
    </p>
  );
}
