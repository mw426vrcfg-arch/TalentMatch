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
        <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
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
                className="w-full rounded-2xl border border-ink/10 bg-cream px-3 py-3 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:text-cream"
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
          className="w-full resize-y rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-cream transition hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? "Bewerbung wird gesendet…" : "Submit"}
      </button>
    </form>
  );
}
