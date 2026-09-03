import { formatSlotTime } from "@/lib/offers/format";

export function TodayAppointmentBanner({
  startTime,
  region,
}: {
  startTime: string;
  region: string;
}) {
  return (
    <aside className="sticky top-3 z-30 mb-8 rounded-xl border border-white/20 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">Heute</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        Dein Termin heute um {formatSlotTime(startTime)} bei {region}. Bitte erscheine pünktlich, um
        Strikes zu vermeiden!
      </p>
    </aside>
  );
}
