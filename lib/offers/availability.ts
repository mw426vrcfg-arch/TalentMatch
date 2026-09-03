import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const OFFER_STATUS_ACTIVE = "active";
export const OFFER_STATUS_FULL = "full";
export const OFFER_STATUS_FULLY_BOOKED = "fully_booked";
export const OFFER_STATUS_EXPIRED = "expired";

export function isFullyBookedStatus(status: string | null | undefined) {
  return status === OFFER_STATUS_FULL || status === OFFER_STATUS_FULLY_BOOKED;
}

export function offerStatusLabel(status: string | null | undefined) {
  if (isFullyBookedStatus(status)) {
    return "fully_booked";
  }
  return status || "active";
}

async function updateOfferRow(admin: Admin, offerId: string, payload: Record<string, unknown>) {
  let next = { ...payload };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await admin.from("offers").update(next).eq("id", offerId);
    if (!error) {
      return;
    }

    if (/fully_booked|invalid input value|offer_status/i.test(error.message) && next.status === OFFER_STATUS_FULLY_BOOKED) {
      next = { ...next, status: OFFER_STATUS_FULL };
      continue;
    }

    const match = error.message.match(/'([^']+)' column/i);
    if (match && match[1] in next) {
      delete next[match[1]];
      continue;
    }

    if (!/does not exist|schema cache/i.test(error.message)) {
      console.error("Offer availability update failed:", error.message);
    }
    return;
  }
}

export async function refreshOfferAvailability(admin: Admin, offerId: string) {
  const { data: slots, error } = await admin
    .from("offer_slots")
    .select("id, is_booked")
    .eq("offer_id", offerId);

  if (error) {
    throw new Error(error.message);
  }

  const { data: offer } = await admin
    .from("offers")
    .select("status")
    .eq("id", offerId)
    .maybeSingle();

  const available = (slots ?? []).filter((slot) => !slot.is_booked).length;

  // Ein abgelaufenes Angebot darf durch eine Stornierung nicht wieder aktiv werden.
  if (offer?.status === OFFER_STATUS_EXPIRED) {
    await updateOfferRow(admin, offerId, { available_slots: available });
    return available;
  }

  await updateOfferRow(admin, offerId, {
    available_slots: available,
    status: available > 0 ? OFFER_STATUS_ACTIVE : OFFER_STATUS_FULLY_BOOKED,
  });
  return available;
}

export async function setInitialAvailableSlots(admin: Admin, offerId: string, count: number) {
  await updateOfferRow(admin, offerId, {
    available_slots: count,
    status: count > 0 ? OFFER_STATUS_ACTIVE : OFFER_STATUS_FULLY_BOOKED,
  });
}
