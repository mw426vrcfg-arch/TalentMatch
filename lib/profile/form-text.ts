/** Formularfelder nie mit null/undefined oder den Strings "null"/"undefined" füllen. */
export function formText(value: unknown): string {
  if (value == null) {
    return "";
  }
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined") {
    return "";
  }
  return String(value);
}
