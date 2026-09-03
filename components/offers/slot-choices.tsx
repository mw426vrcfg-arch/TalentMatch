import Link from "next/link";
import { formatSlotTime, groupSlotsByDay } from "@/lib/offers/format";
import { type BrowseSlot } from "@/lib/offers/load-active-offers";

export function SlotChoices({
  offerId,
  slots,
  compact = false,
}: {
  offerId: string;
  slots: BrowseSlot[];
  compact?: boolean;
}) {
  if (slots.length === 0) {
    return <p className="mt-2 text-sm text-ink-soft">Aktuell keine Termine</p>;
  }

  const groups = groupSlotsByDay(slots);
  const availableCount = slots.filter((slot) => !slot.is_booked).length;

  return (
    <div className={compact ? "mt-3 space-y-4" : "mt-4 space-y-5"}>
      {groups.map((group) => (
        <div key={group.key}>
          <p className="ui-kicker">{group.label}</p>
          <ul className={compact ? "mt-2 flex flex-wrap gap-2" : "mt-2 space-y-2"}>
            {group.slots.map((slot) => (
              <li key={slot.id}>
                {slot.is_booked ? (
                  <span
                    className={
                      compact
                        ? "inline-flex min-h-10 cursor-not-allowed items-center rounded-full border border-white/20 bg-white/40 px-4 py-2 text-xs text-zinc-400 backdrop-blur-md"
                        : "flex min-h-11 w-full cursor-not-allowed items-center justify-between rounded-2xl border border-white/20 bg-white/40 px-4 py-3 text-sm text-zinc-400 backdrop-blur-md"
                    }
                    aria-disabled
                  >
                    <span className="line-through decoration-zinc-300">
                      {formatSlotTime(slot.start_time)}
                    </span>
                    <span className={compact ? "ml-1.5 font-medium no-underline" : "ui-kicker text-zinc-400"}>
                      ausgebucht
                    </span>
                  </span>
                ) : (
                  <Link
                    href={`/offers/${offerId}/apply?slot=${slot.id}`}
                    className={
                      compact
                        ? "ui-chip text-xs"
                        : "ui-chip w-full justify-start"
                    }
                  >
                    {formatSlotTime(slot.start_time)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {availableCount === 0 ? (
        <p className="text-sm text-ink-soft">Alle angezeigten Slots sind ausgebucht.</p>
      ) : null}
    </div>
  );
}
