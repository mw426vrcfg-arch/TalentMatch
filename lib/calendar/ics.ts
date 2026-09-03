const CRLF = "\r\n";

export type CalendarEventInput = {
  uid: string;
  title: string;
  description: string;
  location: string | null;
  startIso: string;
  durationMinutes: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatIcsUtc(isoOrDate: string | Date) {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldIcsLine(line: string) {
  if (line.length <= 75) {
    return line;
  }

  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join(CRLF);
}

export function icsFilename(title: string, startIso: string) {
  const day = formatIcsUtc(startIso).slice(0, 8);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `talentmatch-${slug || "termin"}-${day}.ics`;
}

export function buildIcsCalendar(event: CalendarEventInput) {
  const start = new Date(event.startIso);
  const end = new Date(start.getTime() + Math.max(event.durationMinutes, 15) * 60 * 1000);
  const stamp = formatIcsUtc(start);
  const location = event.location?.trim();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TalentMatch//Booking//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => Boolean(line));

  return `${lines.map(foldIcsLine).join(CRLF)}${CRLF}`;
}
