"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/i18n-provider";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function UrgentCountdown({ iso }: { iso: string }) {
  const t = useT();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setRemaining(new Date(iso).getTime() - Date.now());
    }
    tick();
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [iso]);

  if (remaining === null) {
    return null;
  }

  const label =
    remaining <= 0
      ? t("offer.slotStarts")
      : (() => {
          const total = Math.floor(remaining / 1000);
          const hours = Math.floor(total / 3600);
          const minutes = Math.floor((total % 3600) / 60);
          const seconds = total % 60;
          return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
        })();

  return (
    <span className="inline-flex items-center rounded-full border border-zinc-900/15 bg-zinc-900/90 px-2.5 py-1 font-mono text-[10px] tracking-wide text-white shadow-[0_8px_20px_rgba(29,29,31,0.2)]">
      <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      {label}
    </span>
  );
}
