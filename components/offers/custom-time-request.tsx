"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestCustomTimeAction, type ApplyFormState } from "@/app/offers/actions";
import { Sheet } from "@/components/settings/apple-sheet";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";
import { guestApplyLoginHref } from "@/lib/auth/return-to";

const initialState: ApplyFormState = {};

export function CustomTimeRequestControl({
  offerId,
  signedIn = true,
  compact = false,
  hasHairPhotos = false,
}: {
  offerId: string;
  signedIn?: boolean;
  compact?: boolean;
  hasHairPhotos?: boolean;
}) {
  const t = useT();
  const localize = useLocalize();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestCustomTimeAction, initialState);

  useEffect(() => {
    if (!state.ok || !state.redirectTo) {
      return;
    }
    router.replace(state.redirectTo);
  }, [state.ok, state.redirectTo, router]);

  if (!signedIn) {
    return (
      <Link
        href={guestApplyLoginHref(offerId)}
        className={
          compact
            ? "mt-2 inline-flex text-xs font-medium text-ink underline decoration-zinc-300 underline-offset-4"
            : "mt-3 inline-flex text-sm font-medium text-ink underline decoration-zinc-300 underline-offset-4"
        }
      >
        {t("offer.requestCustomTime")}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "mt-2 inline-flex text-xs font-medium text-ink underline decoration-zinc-300 underline-offset-4"
            : "mt-3 inline-flex text-sm font-medium text-ink underline decoration-zinc-300 underline-offset-4"
        }
      >
        {t("offer.requestCustomTime")}
      </button>
      {open ? (
        <Sheet title={t("offer.customTimeTitle")} onClose={() => setOpen(false)} lockClose={pending}>
          <p className="text-sm leading-relaxed text-ink-soft">{t("offer.customTimeIntro")}</p>
          <form action={formAction} className="mt-5 space-y-5">
            <input type="hidden" name="offer_id" value={offerId} />
            {state.error ? <p className="ui-alert-error">{localize(state.error)}</p> : null}
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("offer.customTimeLabel")}</span>
              <textarea
                name="custom_time_notes"
                required
                rows={3}
                maxLength={300}
                placeholder={t("offer.customTimePlaceholder")}
                className="ui-input resize-y"
              />
            </label>
            <div>
              <p className="text-sm font-medium text-ink">{t("applications.hairImages")}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {hasHairPhotos ? t("offer.customTimeHairOnFile") : t("offer.customTimeHairHint")}
              </p>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm text-ink-soft">{t("applications.front")}</span>
                <input
                  required={!hasHairPhotos}
                  type="file"
                  name="front"
                  accept="image/*"
                  className="ui-file"
                />
              </label>
            </div>
            <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary w-full">
              {pending ? (
                <BusyLabel>{t("offer.customTimeSubmitting")}</BusyLabel>
              ) : (
                t("offer.customTimeSubmit")
              )}
            </button>
          </form>
        </Sheet>
      ) : null}
    </>
  );
}
