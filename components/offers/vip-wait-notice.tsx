"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/i18n-provider";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function VipWaitNotice({ unlockAt }: { unlockAt: number }) {
  const t = useT();
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const delta = unlockAt - Date.now();
      if (delta <= 0) {
        setLabel(t("offer.vipSoon"));
        return;
      }
      const total = Math.floor(delta / 1000);
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      setLabel(`${minutes}:${pad(seconds)}`);
    }
    tick();
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [unlockAt, t]);

  const time = label || "…";
  const [before, after] = t("offer.vipBody", { time: "%%TIME%%" }).split("%%TIME%%");

  return (
    <div className="rounded-[22px] border border-white/30 bg-white/70 p-4 text-sm leading-relaxed text-ink shadow-[0_12px_32px_rgba(15,15,20,0.06)] backdrop-blur-md">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">{t("offer.vipTitle")}</p>
      <p className="mt-2 text-ink">
        {before}
        <span className="font-mono text-ink">{time}</span>
        {after}
      </p>
    </div>
  );
}
