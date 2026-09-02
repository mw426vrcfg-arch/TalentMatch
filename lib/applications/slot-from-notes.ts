const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function parseSlotIdFromNotes(notes: string | null | undefined) {
  if (!notes) {
    return null;
  }

  const tagged = notes.match(new RegExp(`\\[slot:(${UUID})\\]`, "i"));
  if (tagged?.[1]) {
    return tagged[1].toLowerCase();
  }

  const parenthetical = notes.match(new RegExp(`\\((${UUID})\\)`, "i"));
  return parenthetical?.[1]?.toLowerCase() ?? null;
}

export function notesWithSlotRef(notes: string, slotId: string, startTimeIso: string) {
  const withoutOld = notes
    .replace(/\n*\[slot:[0-9a-f-]+\]/gi, "")
    .replace(/\n*Gewünschter Slot:.*$/gim, "")
    .trim();

  return [withoutOld, `Gewünschter Slot: ${startTimeIso}`, `[slot:${slotId}]`]
    .filter(Boolean)
    .join("\n");
}

export function notesForDisplay(notes: string | null) {
  if (!notes) {
    return null;
  }

  return notes
    .replace(/\n*\[slot:[0-9a-f-]+\]/gi, "")
    .trim();
}
