"use client";

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
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">Smart Pricing</p>
        <p className="font-serif text-2xl leading-none text-ink">
          {rounded.toLocaleString("de-CH", { maximumFractionDigits: 1 })}%
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
          🔥 Top-Deal: Hohe Buchungschance innerhalb von 30 Minuten
        </p>
      ) : null}
      {lowDeal ? (
        <p className="px-4 py-3 text-sm leading-relaxed text-amber-800">
          💡 Tipp: Erhöhe den Rabatt um 10%, um schneller passende Modelle zu finden.
        </p>
      ) : null}
    </aside>
  );
}
