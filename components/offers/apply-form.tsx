"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { applyToOfferAction, type ApplyFormState } from "@/app/offers/actions";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";

const initialState: ApplyFormState = {};

type ApplyFormProps = {
  offerId: string;
  slotId: string;
};

export function ApplyForm({ offerId, slotId }: ApplyFormProps) {
  const t = useT();
  const localize = useLocalize();
  const router = useRouter();
  const trackedRequest = useRef(false);
  const [state, formAction, pending] = useActionState(applyToOfferAction, initialState);

  useEffect(() => {
    if (!state.ok || trackedRequest.current) {
      return;
    }
    trackedRequest.current = true;
    trackEvent(ANALYTICS_EVENTS.requestAppointment, {
      offer_id: offerId,
      slot_id: slotId,
    });
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state.ok, state.redirectTo, offerId, slotId, router]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="offer_id" value={offerId} />
      <input type="hidden" name="slot_id" value={slotId} />

      {state.error && (
        <p className="ui-alert-error">
          {localize(state.error)}
        </p>
      )}

      <div>
        <p className="text-sm font-medium text-ink">{t("applications.hairImages")}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {t("applications.hairImagesHint")}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["front", "applications.front", true],
              ["back", "applications.back", false],
              ["side", "applications.side", false],
            ] as const
          ).map(([name, key, required]) => (
            <label key={name} className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t(key)}</span>
              <input
                required={required}
                type="file"
                name={name}
                accept="image/*"
                className="ui-file"
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("applications.notes")}</span>
        <textarea
          name="notes"
          rows={4}
          placeholder={t("applications.notesPlaceholder")}
          className="ui-input resize-y"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="ui-btn-primary w-full"
      >
        {pending ? <BusyLabel>{t("actions.submittingApplication")}</BusyLabel> : t("actions.submitApplication")}
      </button>
    </form>
  );
}
