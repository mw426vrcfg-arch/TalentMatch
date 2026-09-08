export function combineLocalDateTime(date: string, time: string) {
  const trimmedDate = date.trim();
  const trimmedTime = time.trim();
  if (!trimmedDate || !trimmedTime) {
    return "";
  }

  return parseDateTimeLocalToIso(`${trimmedDate}T${trimmedTime}`);
}

/**
 * `<input type="datetime-local">` (`YYYY-MM-DDTHH:mm`) als Europe/Zurich → ISO-UTC.
 */
export function parseDateTimeLocalToIso(value: string, timeZone = "Europe/Zurich") {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/,
  );
  if (!match) {
    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utcMs));
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? "0");
    let zonedHour = read("hour");
    if (zonedHour === 24) {
      zonedHour = 0;
    }
    const zonedAsUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      zonedHour,
      read("minute"),
      read("second"),
    );
    const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const delta = wantedAsUtc - zonedAsUtc;
    if (delta === 0) {
      break;
    }
    utcMs += delta;
  }

  const result = new Date(utcMs);
  return Number.isNaN(result.getTime()) ? "" : result.toISOString();
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
    return { error: "Bitte mindestens eine Uhrzeit als freien Termin setzen." };
  }

  const slots = slotStarts.map((startValue) => {
    const start = new Date(startValue);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  });

  if (slots.some(({ start, end }) => Number.isNaN(start.getTime()) || end <= start)) {
    return { error: "Mindestens ein Termin hat ein ungültiges Datum oder eine ungültige Uhrzeit." };
  }

  const unique = new Set(slots.map(({ start }) => start.getTime()));
  if (unique.size !== slots.length) {
    return { error: "Dieselbe Uhrzeit kann nicht zweimal als freien Termin gesetzt werden." };
  }

  const ordered = slots.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.start < previous.end) {
      return {
        error:
          "Die neuen Zeiten überschneiden sich mit bestehenden Terminen.",
      };
    }
  }

  return { slots };
}
