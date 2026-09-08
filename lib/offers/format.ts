const ZURICH_TZ = "Europe/Zurich";

function stableIntlText(value: string) {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

export function savingsPercent(normalPrice: number | string, discountPrice: number | string) {
  const normal = Number(normalPrice);
  const discount = Number(discountPrice);
  if (!Number.isFinite(normal) || !Number.isFinite(discount) || normal <= 0 || discount < 0 || discount >= normal) {
    return null;
  }
  return Math.round(((normal - discount) / normal) * 100);
}

export function isStrongSaving(percent: number | null, threshold = 30) {
  return percent != null && percent >= threshold;
}

export function formatChf(value: number | string, locale = "de-CH") {
  return stableIntlText(
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "CHF",
    }).format(Number(value)),
  );
}

export function formatSlot(iso: string, locale = "de-CH") {
  return stableIntlText(
    new Intl.DateTimeFormat(locale, {
      timeZone: ZURICH_TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)),
  );
}

export function formatSlotTime(iso: string, locale = "de-CH") {
  return stableIntlText(
    new Intl.DateTimeFormat(locale, {
      timeZone: ZURICH_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)),
  );
}

export function formatSlotDay(iso: string, locale = "de-CH") {
  return stableIntlText(
    new Intl.DateTimeFormat(locale, {
      timeZone: ZURICH_TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso)),
  );
}

export function formatSlotClock(iso: string) {
  return stableIntlText(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZURICH_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)),
  );
}

export function slotDayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZURICH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function groupSlotsByDay<T extends { start_time: string }>(slots: T[]) {
  const groups = new Map<string, { key: string; label: string; slots: T[] }>();

  for (const slot of slots) {
    const key = slotDayKey(slot.start_time);
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
    } else {
      groups.set(key, {
        key,
        label: formatSlotDay(slot.start_time),
        slots: [slot],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((group) => ({
      ...group,
      slots: group.slots
        .slice()
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    }));
}

export function formatAppointmentWhen(iso: string) {
  return stableIntlText(
    new Intl.DateTimeFormat("de-CH", {
      timeZone: ZURICH_TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)),
  );
}

