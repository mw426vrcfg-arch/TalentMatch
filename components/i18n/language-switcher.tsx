"use client";

import { useI18n } from "@/components/i18n/i18n-provider";
import { LOCALE_SWITCH_ORDER, localeLabel, localeShort, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  const pills = (
    <div
      className={`grid grid-cols-3 gap-0.5 rounded-full bg-white/55 p-0.5 ring-1 ring-white/40 ${
        compact ? "" : "mt-0"
      }`}
      role="group"
      aria-label={t("settings.language")}
    >
      {LOCALE_SWITCH_ORDER.map((option: Locale) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={`rounded-full font-semibold tracking-[0.08em] transition-all duration-300 ease-out ${
              compact ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-xs"
            } ${
              active
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-600 hover:bg-white/80 hover:text-neutral-900"
            }`}
            aria-pressed={active}
            aria-label={localeLabel(option)}
            title={localeLabel(option)}
          >
            {localeShort(option)}
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    return pills;
  }

  return (
    <div className="px-2 pb-3 pt-1">
      <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
        {t("settings.language")}
      </p>
      {pills}
    </div>
  );
}
