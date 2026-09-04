"use client";

import { useT } from "@/components/i18n/i18n-provider";
import { hapticTap } from "@/lib/ui/haptic";

export function UrgentFilterToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = useT();

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        hapticTap("light");
        onChange(!on);
      }}
      className={`${on ? "ui-choice-active" : "ui-choice"} gap-2 transition-all duration-300 ease-out`}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {t("browse.urgentFilter")}
    </button>
  );
}
