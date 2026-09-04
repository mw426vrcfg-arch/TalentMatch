"use client";

import { useLocale, useT } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/config";

function parseAmount(value: string) {
  const amount = Number(value.replace(",", ".").trim());
  return Number.isFinite(amount) ? amount : NaN;
}

export function discountPercent(normalPrice: string, dealPrice: string) {
  if (!normalPrice.trim() || !dealPrice.trim()) {
    return null;
  }
  const normal = parseAmount(normalPrice);
  const deal = parseAmount(dealPrice);
  if (!(normal > 0) || !Number.isFinite(deal) || deal < 0) {
    return null;
  }
  return ((normal - deal) / normal) * 100;
}

export function SmartPricingWidget({
  normalPrice,
  dealPrice,
}: {
  normalPrice: string;
  dealPrice: string;
}) {
  const t = useT();
  const locale = useLocale();
  const percent = discountPercent(normalPrice, dealPrice);
  if (percent == null) {
    return null;
  }

  const rounded = Math.round(percent * 10) / 10;
  const topDeal = percent > 60;
  const lowDeal = percent < 30;

  return (
    <aside className="overflow-hidden rounded-[22px] border border-white/30 bg-white/60 shadow-[0_12px_32px_rgba(15,15,20,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">{t("pricing.kicker")}</p>
        <p className="font-serif text-2xl leading-none text-ink">
          {rounded.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 })}%
        </p>
      </div>
      <div className="h-1 bg-white/40">
        <div
          className={`h-full transition-[width] duration-300 ease-out ${
            topDeal ? "bg-emerald-600/80" : lowDeal ? "bg-amber-400/90" : "bg-zinc-800/70"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      {topDeal ? (
        <p className="px-4 py-3 text-sm leading-relaxed text-emerald-800">
          {t("pricing.topDeal")}
        </p>
      ) : null}
      {lowDeal ? (
        <p className="px-4 py-3 text-sm leading-relaxed text-amber-800">
          {t("pricing.lowDeal")}
        </p>
      ) : null}
    </aside>
  );
}
