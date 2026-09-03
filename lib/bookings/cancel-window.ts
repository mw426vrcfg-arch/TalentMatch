const LATE_CANCEL_MS = 24 * 60 * 60 * 1000;

export function isLateCancellation(startTimeIso: string, now = Date.now()) {
  const start = new Date(startTimeIso).getTime();
  if (Number.isNaN(start)) {
    return false;
  }
  const remaining = start - now;
  return remaining > 0 && remaining < LATE_CANCEL_MS;
}
