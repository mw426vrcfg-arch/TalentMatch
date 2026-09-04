export function partnerSalonCode(stableId: string) {
  let hash = 2166136261;
  for (let index = 0; index < stableId.length; index += 1) {
    hash ^= stableId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 100 + ((hash >>> 0) % 900);
}

export function partnerSalonLabel(stableId: string) {
  return `Salon #${partnerSalonCode(stableId)}`;
}

export function regionLabel(city: string | null | undefined) {
  const value = city?.trim();
  if (!value || value === "Standort folgt") {
    return "Region folgt";
  }
  if (value.toLocaleLowerCase("de-CH").startsWith("region ")) {
    return value;
  }
  return `Region ${value}`;
}

export function isSalonIdentityRevealed(
  applicationStatus: string,
  bookingStatus?: string | null,
) {
  return (
    applicationStatus === "accepted" ||
    bookingStatus === "confirmed" ||
    bookingStatus === "completed"
  );
}
