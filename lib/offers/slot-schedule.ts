export function combineLocalDateTime(date: string, time: string) {
  const trimmedDate = date.trim();
  const trimmedTime = time.trim();
  if (!trimmedDate || !trimmedTime) {
    return "";
  }

  const withSeconds = trimmedTime.length === 5 ? `${trimmedTime}:00` : trimmedTime;
  const parsed = new Date(`${trimmedDate}T${withSeconds}`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

export type ScheduledSlot = {
  start: Date;
  end: Date;
};

export function scheduleSlotsFromIso(
  slotStarts: string[],
  durationMinutes: number,
): { slots?: ScheduledSlot[]; error?: string } {
  if (slotStarts.length === 0) {
    return { error: "Bitte mindestens eine Uhrzeit als Available Slot setzen." };
  }

  const slots = slotStarts.map((startValue) => {
    const start = new Date(startValue);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  });

  if (slots.some(({ start, end }) => Number.isNaN(start.getTime()) || end <= start)) {
    return { error: "Mindestens ein Slot hat ein ungültiges Datum oder eine ungültige Uhrzeit." };
  }

  const unique = new Set(slots.map(({ start }) => start.getTime()));
  if (unique.size !== slots.length) {
    return { error: "Dieselbe Uhrzeit kann nicht zweimal als Slot gesetzt werden." };
  }

  const ordered = slots.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.start < previous.end) {
      return {
        error:
          "Slots dürfen sich nicht überschneiden. Passe die Uhrzeiten oder die Duration an.",
      };
    }
  }

  return { slots };
}
