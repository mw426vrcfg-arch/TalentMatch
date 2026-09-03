"use client";

import { useEffect, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function UrgentCountdown({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const delta = new Date(iso).getTime() - Date.now();
      if (delta <= 0) {
        setLabel("Slot startet");
        return;
      }
      const total = Math.floor(delta / 1000);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      setLabel(hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`);
    }
    tick();
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [iso]);

  if (!label) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-zinc-900/15 bg-zinc-900/90 px-2.5 py-1 font-mono text-[10px] tracking-wide text-white shadow-[0_8px_20px_rgba(29,29,31,0.2)]">
      <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      {label}
    </span>
  );
}
