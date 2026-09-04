"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/i18n/i18n-provider";
import { hapticTap } from "@/lib/ui/haptic";

export function OfferEditorOverlay({
  kicker,
  title,
  subtitle,
  onClose,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  function close() {
    if (leaving) {
      return;
    }
    hapticTap("cancel");
    setLeaving(true);
    window.setTimeout(onClose, 220);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // close is scoped to this overlay instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      data-ptr-ignore
      className={`fixed inset-0 z-[80] flex items-stretch justify-center bg-zinc-900/45 p-0 backdrop-blur-lg sm:items-center sm:p-4 ${
        leaving ? "ui-overlay-out" : "ui-overlay"
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        className={`flex h-full w-full max-h-none flex-col overflow-hidden border border-white/20 bg-white/80 shadow-[0_30px_80px_rgba(15,15,20,0.24)] backdrop-blur-xl sm:h-[min(96vh,880px)] sm:max-w-2xl sm:rounded-[32px] ${
          leaving ? "ui-sheet-out" : "ui-sheet"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/30 px-5 py-4 sm:px-8">
          <div>
            <p className="ui-kicker">{kicker}</p>
            <h2 className="mt-1 font-serif text-3xl text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={close} className="ui-btn-secondary px-3 text-xs">
            {t("common.close")}
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-6 pb-10 sm:px-8">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
