export const REQUESTED_CUSTOM_TIME = "requested_custom_time";
export const CUSTOM_TIME_MARKER = "[custom_time]";
export const OFFICIAL_CONFIRM_MARKER = "[system:official_confirm]";

export function isCustomTimeRequest(
  status?: string | null,
  notes?: string | null,
  customTimeNotes?: string | null,
) {
  if (status === REQUESTED_CUSTOM_TIME) {
    return true;
  }
  if (customTimeNotes?.trim()) {
    return true;
  }
  return Boolean(notes && notes.includes(CUSTOM_TIME_MARKER));
}

export function parseCustomTimeNotes(
  notes?: string | null,
  customTimeNotes?: string | null,
) {
  const fromColumn = customTimeNotes?.trim();
  if (fromColumn) {
    return fromColumn;
  }
  if (!notes) {
    return null;
  }
  const match = notes.match(/Wunschtermin:\s*([\s\S]+?)(?:\n\s*\[custom_time\]|$)/i);
  const value = match?.[1]?.trim();
  return value || null;
}

export function notesWithCustomTime(notes: string, customTime: string) {
  const withoutOld = notes
    .replace(/\n*Wunschtermin:\s*[\s\S]*?(?=\n\s*\[custom_time\]|$)/gi, "")
    .replace(/\n*\[custom_time\]/gi, "")
    .trim();

  return [withoutOld, `Wunschtermin: ${customTime}`, CUSTOM_TIME_MARKER]
    .filter(Boolean)
    .join("\n");
}

export function notesWithFinalTime(notes: string, finalTime: string) {
  const withoutOld = notes.replace(/\n*Finaltermin:\s*.*$/gim, "").trim();
  return [withoutOld, `Finaltermin: ${finalTime}`].filter(Boolean).join("\n");
}

export function customTimeRequestChatMessage(offerTitle: string, customTime: string) {
  const title = offerTitle.trim() || "Angebot";
  return `Hallo! Ich habe Interesse an eurem Angebot '${title}', aber die Zeiten passen mir nicht ganz. Mein Wunschtermin wäre: ${customTime}. Passt euch das?`;
}

export function officialConfirmChatMessage(finalTime: string) {
  return `${OFFICIAL_CONFIRM_MARKER}✅ Der Salon hat den Termin offiziell bestätigt für: ${finalTime}`;
}

export function officialConfirmDisplay(body: string) {
  if (body.startsWith(OFFICIAL_CONFIRM_MARKER)) {
    return body.slice(OFFICIAL_CONFIRM_MARKER.length).trim();
  }
  return body;
}

export function isOfficialConfirmMessage(body: string) {
  return (
    body.startsWith(OFFICIAL_CONFIRM_MARKER) ||
    body.startsWith("✅ Der Salon hat den Termin offiziell bestätigt für:")
  );
}

export function isInvalidApplicationStatusError(message: string) {
  return /requested_custom_time|invalid input value for enum|22P02/i.test(message);
}
