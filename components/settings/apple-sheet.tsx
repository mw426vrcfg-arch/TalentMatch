"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/i18n/i18n-provider";
import { hapticTap } from "@/lib/ui/haptic";

export function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function FeedbackToast({
  message,
  onClose,
  variant = "success",
}: {
  message: string;
  onClose: () => void;
  variant?: "success" | "error";
}) {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isError = variant === "error";

  useEffect(() => {
    setMounted(true);
    hapticTap(isError ? "cancel" : "success");
    const hide = window.setTimeout(() => setLeaving(true), 3000);
    return () => window.clearTimeout(hide);
  }, [isError]);

  useEffect(() => {
    if (!leaving) {
      return;
    }
    const done = window.setTimeout(onClose, 220);
    return () => window.clearTimeout(done);
  }, [leaving, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      data-ptr-ignore
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[90] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className={`ui-success-toast pointer-events-auto ${leaving ? "ui-success-toast-out" : ""}`}>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
            isError
              ? "bg-[#FF3B30] shadow-[0_4px_12px_rgba(255,59,48,0.28)]"
              : "bg-[#34c759] shadow-[0_4px_12px_rgba(52,199,89,0.28)]"
          }`}
        >
          {isError ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
              <path strokeLinecap="round" d="M12 7v7M12 17.5v.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 10 17.5 19 7.5" />
            </svg>
          )}
        </span>
        <p className="min-w-0 text-[15px] font-medium leading-snug text-ink">{message}</p>
      </div>
    </div>,
    document.body,
  );
}

export function Sheet({
  title,
  onClose,
  closing = false,
  lockClose = false,
  children,
}: {
  title: string;
  onClose: () => void;
  closing?: boolean;
  lockClose?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      data-ptr-ignore
      className={`ui-overlay fixed inset-0 z-[80] flex items-end justify-center bg-zinc-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        closing ? "ui-overlay-out" : ""
      }`}
      onClick={lockClose || closing ? undefined : onClose}
      role="presentation"
    >
      <div
        className={`ui-sheet mb-[env(safe-area-inset-bottom)] max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/30 bg-white/90 p-5 shadow-[0_30px_80px_rgba(15,15,20,0.24)] backdrop-blur-xl sm:mb-0 sm:rounded-[28px] sm:p-7 ${
          closing ? "ui-sheet-out" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sheet-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="settings-sheet-title" className="font-serif text-3xl text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={lockClose || closing}
            className="ui-btn-secondary px-3 text-xs"
          >
            {t("common.close")}
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
