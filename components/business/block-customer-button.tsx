"use client";

import { useState, useTransition } from "react";
import { toggleBlacklistAction } from "@/app/business/blacklist-actions";
import { FeedbackToast, Sheet } from "@/components/settings/apple-sheet";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { hapticTap } from "@/lib/ui/haptic";

export function BlockCustomerButton({
  customerId,
  customerName,
  initialBlocked = false,
}: {
  customerId: string;
  customerName?: string | null;
  initialBlocked?: boolean;
}) {
  const t = useT();
  const localize = useLocalize();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [pending, startToggle] = useTransition();
  const name = customerName?.trim() || t("booking.blockNameFallback");

  function runToggle(showSuccess: boolean) {
    startToggle(async () => {
      const formData = new FormData();
      formData.set("customer_id", customerId);
      const result = await toggleBlacklistAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBlocked(Boolean(result.blocked));
      setOpen(false);
      if (showSuccess && result.blocked) {
        setToast(true);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      {error && !open ? <p className="text-sm text-rose">{localize(error)}</p> : null}
      <button
        type="button"
        disabled={pending}
        className="ui-btn-secondary px-3 text-xs"
        onClick={() => {
          hapticTap("light");
          setError(null);
          if (blocked) {
            runToggle(false);
            return;
          }
          setOpen(true);
        }}
      >
        {pending ? t("booking.blocking") : blocked ? t("booking.blocked") : t("booking.blockCustomer")}
      </button>
      {open ? (
        <Sheet
          title={t("booking.blockTitle")}
          lockClose={pending}
          onClose={() => {
            if (!pending) {
              setOpen(false);
            }
          }}
        >
          <p className="text-sm leading-relaxed text-ink">{t("booking.blockConfirm", { name })}</p>
          {error ? <p className="ui-alert-error mt-4">{localize(error)}</p> : null}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="ui-btn-secondary w-full"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF3B30] px-5 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-[#ff2d20] active:scale-95 disabled:opacity-60"
              onClick={() => {
                hapticTap("cancel");
                runToggle(true);
              }}
            >
              {pending ? (
                <svg viewBox="0 0 24 24" className="ui-spin h-4 w-4" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.2" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              ) : null}
              {t("booking.blockYes")}
            </button>
          </div>
        </Sheet>
      ) : null}
      {toast ? <FeedbackToast message={t("booking.blockSuccess")} onClose={() => setToast(false)} /> : null}
    </div>
  );
}
