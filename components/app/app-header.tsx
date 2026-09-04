"use client";

import { useEffect, useState, type ReactNode } from "react";

const COMPACT_AFTER_Y = 20;

function useCompactHeader(threshold = COMPACT_AFTER_Y) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      const next = window.scrollY > threshold;
      setCompact((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [threshold]);

  return compact;
}

export function AppHeader({ children }: { children: ReactNode }) {
  const compact = useCompactHeader();

  return (
    <header
      data-compact={compact ? "true" : "false"}
      className={`sticky top-0 z-20 overflow-visible border-b transition-[background-color,border-color,box-shadow,backdrop-filter,-webkit-backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        compact
          ? "border-neutral-200/40 bg-white/70 shadow-[0_4px_30px_rgba(0,0,0,0.02)] backdrop-blur-xl max-sm:[&_.app-header-brand]:origin-left max-sm:[&_.app-header-brand]:scale-[0.92] [&_.app-header-logo]:h-8 [&_.app-header-logo]:w-8 [&_.ui-kicker]:opacity-70"
          : "border-transparent bg-transparent shadow-none backdrop-blur-none"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 ${
          compact ? "py-2 sm:py-3" : "py-4 sm:py-5"
        }`}
      >
        {children}
      </div>
    </header>
  );
}
