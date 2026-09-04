"use client";

import { useActionState } from "react";
import { applyToOfferAction, type ApplyFormState } from "@/app/offers/actions";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";

const initialState: ApplyFormState = {};

type ApplyFormProps = {
  offerId: string;
  slotId: string;
};

export function ApplyForm({ offerId, slotId }: ApplyFormProps) {
  const t = useT();
  const localize = useLocalize();
  const [state, formAction, pending] = useActionState(applyToOfferAction, initialState);

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
        className="ui-btn-primary w-full"
      >
        {pending ? t("actions.submittingApplication") : t("actions.submitApplication")}
      </button>
    </form>
  );
}
