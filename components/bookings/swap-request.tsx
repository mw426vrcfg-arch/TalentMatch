"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  loadSwapSlotsAction,
  requestSlotSwapAction,
  type SwapState,
} from "@/app/bookings/swap-actions";
import { type SwapSlot } from "@/lib/bookings/swap";
import { choiceChipClass } from "@/components/hair/choice-chip";
import { Skeleton, SkeletonChips } from "@/components/ui/skeleton";
import { formatSlotDay, formatSlotTime } from "@/lib/offers/format";

const initial: SwapState = {};

export function SwapRequestButton({ applicationId }: { applicationId: string }) {
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
        {state.success ? <p className="text-sm text-ink-soft">{state.success}</p> : null}
        <button type="button" onClick={() => setOpen(true)} className="ui-btn-secondary">
          Verschiebung anfragen
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[22px] border border-white/30 bg-white/70 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">Neue Wunschzeit</p>
          <p className="mt-1 text-sm text-ink-soft">
            Der Salon entscheidet. Bis dahin bleibt dein bestehender Termin gültig.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="ui-btn-secondary px-3 text-xs">
          Schliessen
        </button>
      </div>

      {state.error ? <p className="ui-alert-error mt-3">{state.error}</p> : null}
      {loadError ? <p className="ui-alert-error mt-3">{loadError}</p> : null}

      {loading ? (
        <div className="mt-4 space-y-3">
          <SkeletonChips count={4} />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      ) : slots.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Für dieses Angebot gibt es aktuell keine anderen freien Slots.
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
                {formatSlotDay(slot.start_time)} · {formatSlotTime(slot.start_time)}
              </button>
            ))}
          </div>
          <button type="submit" disabled={pending || !selected} className="ui-btn-primary">
            {pending ? "Wird gesendet…" : "Anfrage senden"}
          </button>
        </form>
      )}
    </div>
  );
}

export function SwapPendingNote({ requestedStart }: { requestedStart: string | null }) {
  return (
    <p className="w-full rounded-[22px] border border-white/30 bg-white/70 px-4 py-3 text-sm text-ink-soft backdrop-blur-md">
      Verschiebung angefragt
      {requestedStart
        ? ` auf ${formatSlotDay(requestedStart)}, ${formatSlotTime(requestedStart)}.`
        : "."}{" "}
      Der Salon prüft die Anfrage — dein aktueller Termin bleibt bis dahin bestehen.
    </p>
  );
}
