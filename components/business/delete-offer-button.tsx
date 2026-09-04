"use client";

import { useState, useTransition } from "react";
import { deleteOfferAction } from "@/app/business/actions";
import { Sheet } from "@/components/settings/apple-sheet";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { isOwnSalonOffer } from "@/lib/offers/ownership";
import type { SalonOfferListItem } from "@/lib/offers/salon-list";
import { hapticTap } from "@/lib/ui/haptic";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path strokeLinecap="round" d="M4.5 7.25h15" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 7.25V5.6A1.6 1.6 0 0 1 11.1 4h1.8a1.6 1.6 0 0 1 1.6 1.6v1.65" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.75 7.25 17.1 18.2a1.9 1.9 0 0 1-1.9 1.7H8.8a1.9 1.9 0 0 1-1.9-1.7L6.25 7.25"
      />
      <path strokeLinecap="round" d="M10 11.25v5.1M14 11.25v5.1" />
    </svg>
  );
}

export function DeleteOfferButton({
  offer,
  currentUserId,
  onDeleted,
}: {
  offer: SalonOfferListItem;
  currentUserId: string;
  onDeleted: (offerId: string) => void;
}) {
  const t = useT();
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startDelete] = useTransition();

  if (!isOwnSalonOffer(offer, currentUserId) || offer.salon_id !== currentUserId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          hapticTap("light");
          setError(null);
          setOpen(true);
        }}
        className="ui-icon-btn ui-icon-btn-danger"
        aria-label={t("salon.deleteAria", { title: offer.title })}
      >
        <TrashIcon />
      </button>
      {open ? (
        <Sheet
          title={t("salon.deleteTitle")}
          lockClose={pending}
          onClose={() => {
            if (!pending) {
              setOpen(false);
            }
          }}
        >
          <p className="text-sm leading-relaxed text-ink">{t("salon.deleteConfirm")}</p>
          {error ? <p className="ui-alert-error mt-4">{localize(error)}</p> : null}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="ui-btn-secondary w-full"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("salon.deleteCancel")}
            </button>
            <button
              type="button"
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF3B30] px-5 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-[#ff2d20] active:scale-95 disabled:opacity-60"
              onClick={() => {
                hapticTap("cancel");
                startDelete(async () => {
                  const result = await deleteOfferAction(offer.id);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setOpen(false);
                  onDeleted(offer.id);
                });
              }}
            >
              {pending ? (
                <svg viewBox="0 0 24 24" className="ui-spin h-4 w-4" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.2" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              ) : null}
              {t("salon.deleteYes")}
            </button>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
