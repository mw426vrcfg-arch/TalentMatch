export function salonIdOfOffer(offer: {
  salon_id?: string | null;
  business_id?: string | null;
}) {
  return String(offer.salon_id || offer.business_id || "");
}

/**
 * Eiserne Frontend-Sperre: der Stift darf nur bei exakter Besitzer-ID erscheinen.
 * salon_id = offers.business_id (Salonprofil), currentUserId = ID des angemeldeten Salons.
 */
export function isOwnSalonOffer(
  offer: { salon_id?: string | null; business_id?: string | null },
  currentUserId: string | null | undefined,
) {
  if (!currentUserId) {
    return false;
  }
  const salonId = salonIdOfOffer(offer);
  return salonId !== "" && salonId === currentUserId;
}
