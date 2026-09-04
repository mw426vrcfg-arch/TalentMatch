/** Canonical last-minute flag on `offers.is_urgent`. */
export function isUrgentFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true" || value === "t" || value === "on";
}
