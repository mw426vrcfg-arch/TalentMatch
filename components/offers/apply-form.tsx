"use client";

import { useActionState } from "react";
import { applyToOfferAction, type ApplyFormState } from "@/app/offers/actions";

const initialState: ApplyFormState = {};

type ApplyFormProps = {
  offerId: string;
  slotId: string;
};

export function ApplyForm({ offerId, slotId }: ApplyFormProps) {
  const [state, formAction, pending] = useActionState(applyToOfferAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="offer_id" value={offerId} />
      <input type="hidden" name="slot_id" value={slotId} />

      {state.error && (
        <p className="ui-alert-error">
          {state.error}
        </p>
      )}

      <div>
        <p className="text-sm font-medium text-ink">Hair Images</p>
        <p className="mt-1 text-xs text-ink-soft">
          Pflicht für den Prototyp: Front, Back und Side als einfache Bild-Uploads.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["front", "Front"],
            ["back", "Back"],
            ["side", "Side"],
          ].map(([name, label]) => (
            <label key={name} className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
              <input
                required
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
        <span className="mb-1.5 block text-sm text-ink-soft">Notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Hatte vor 2 Jahren Blondierung."
          className="ui-input resize-y"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="ui-btn-primary w-full"
      >
        {pending ? "Bewerbung wird gesendet…" : "Submit"}
      </button>
    </form>
  );
}
