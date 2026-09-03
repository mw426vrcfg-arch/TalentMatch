import { notesWithSlotRef, parseSlotIdFromNotes } from "@/lib/applications/slot-from-notes";
import { createNotification } from "@/lib/notifications/create";
import { refreshOfferAvailability } from "@/lib/offers/availability";
import { formatSlot } from "@/lib/offers/format";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const SWAP_REQUESTED = "swap_requested";

export type SwapSlot = {
  id: string;
  start_time: string;
};

const MISSING_COLUMN = "Verschiebungen sind noch nicht aktiviert. Bitte slot_swap.sql in Supabase ausführen.";

function isMissingSwapColumn(message: string) {
  return /requested_slot_id/i.test(message) && /column|schema cache|does not exist/i.test(message);
}

async function loadBooking(admin: Admin, applicationId: string) {
  const full = await admin
    .from("bookings")
    .select("id, slot_id, booking_status, requested_slot_id")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (!full.error) {
    return full.data as
      | { id: string; slot_id: string | null; booking_status: string | null; requested_slot_id: string | null }
      | null;
  }

  const base = await admin
    .from("bookings")
    .select("id, slot_id, booking_status")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (base.error) {
    throw new Error(base.error.message);
  }

  return base.data
    ? { ...(base.data as { id: string; slot_id: string | null; booking_status: string | null }), requested_slot_id: null }
    : null;
}

async function loadSwapContext(applicationId: string) {
  const admin = createAdminClient();
  const { data: application, error } = await admin
    .from("applications")
    .select("id, customer_id, offer_id, notes, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new Error(error?.message ?? "Termin nicht gefunden.");
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, title, business_id")
    .eq("id", application.offer_id)
    .maybeSingle();

  if (!offer) {
    throw new Error("Angebot nicht gefunden.");
  }

  const booking = await loadBooking(admin, application.id as string);
  const currentSlotId =
    (booking?.slot_id as string | null | undefined) || parseSlotIdFromNotes(application.notes as string | null);

  return { admin, application, offer, booking, currentSlotId };
}

async function bookedSlotIds(admin: Admin, slotIds: string[]) {
  if (slotIds.length === 0) {
    return new Set<string>();
  }
  const { data } = await admin.from("bookings").select("slot_id, booking_status").in("slot_id", slotIds);
  const taken = new Set<string>();
  for (const row of data ?? []) {
    if (row.booking_status === "cancelled") {
      continue;
    }
    if (row.slot_id) {
      taken.add(String(row.slot_id));
    }
  }
  return taken;
}

export async function loadSwapCandidates(customerId: string, applicationId: string): Promise<SwapSlot[]> {
  const { admin, application, offer, currentSlotId } = await loadSwapContext(applicationId);

  if (application.customer_id !== customerId) {
    throw new Error("Dieser Termin gehört nicht zu dir.");
  }

  const { data: slots, error } = await admin
    .from("offer_slots")
    .select("id, start_time, is_booked")
    .eq("offer_id", offer.id)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const now = Date.now();
  const upcoming = (slots ?? []).filter((slot) => {
    if (String(slot.id) === currentSlotId) {
      return false;
    }
    if (slot.is_booked) {
      return false;
    }
    return new Date(String(slot.start_time)).getTime() > now;
  });

  const taken = await bookedSlotIds(
    admin,
    upcoming.map((slot) => String(slot.id)),
  );

  return upcoming
    .filter((slot) => !taken.has(String(slot.id)))
    .map((slot) => ({ id: String(slot.id), start_time: String(slot.start_time) }));
}

export async function requestSlotSwap(input: {
  customerId: string;
  applicationId: string;
  requestedSlotId: string;
}) {
  const { admin, application, offer, booking } = await loadSwapContext(input.applicationId);

  if (application.customer_id !== input.customerId) {
    throw new Error("Dieser Termin gehört nicht zu dir.");
  }

  if (application.status !== "accepted") {
    throw new Error("Nur bestätigte Termine können verschoben werden.");
  }

  if (!booking?.id) {
    throw new Error("Zu diesem Termin gibt es noch keine Buchung.");
  }

  if (booking.booking_status === "completed" || booking.booking_status === "no_show") {
    throw new Error("Abgeschlossene Termine können nicht verschoben werden.");
  }

  const candidates = await loadSwapCandidates(input.customerId, input.applicationId);
  const wanted = candidates.find((slot) => slot.id === input.requestedSlotId);

  if (!wanted) {
    throw new Error("Dieser Slot ist nicht mehr frei. Bitte wähle eine andere Uhrzeit.");
  }

  const full = await admin
    .from("bookings")
    .update({ booking_status: SWAP_REQUESTED, requested_slot_id: wanted.id })
    .eq("id", booking.id);

  if (full.error) {
    if (isMissingSwapColumn(full.error.message)) {
      throw new Error(MISSING_COLUMN);
    }

    // booking_status ist ein Enum ohne 'swap_requested': Anfrage trotzdem hinterlegen.
    const partial = await admin
      .from("bookings")
      .update({ requested_slot_id: wanted.id })
      .eq("id", booking.id);

    if (partial.error) {
      throw new Error(isMissingSwapColumn(partial.error.message) ? MISSING_COLUMN : partial.error.message);
    }
  }

  const { data: business } = await admin
    .from("business_profiles")
    .select("user_id")
    .eq("id", offer.business_id)
    .maybeSingle();
  const salonUserId = (business?.user_id as string | undefined) || (offer.business_id as string);

  await createNotification(admin, {
    userId: salonUserId,
    type: "swap_requested",
    title: "Verschiebung angefragt",
    message: `Ein Modell möchte „${offer.title}“ auf ${formatSlot(wanted.start_time)} verschieben.`,
    applicationId: application.id as string,
    offerId: application.offer_id as string,
  });

  return { start_time: wanted.start_time };
}

export async function resolveSlotSwap(input: {
  salonBusinessId: string | null;
  applicationId: string;
  accept: boolean;
}) {
  const { admin, application, offer, booking, currentSlotId } = await loadSwapContext(input.applicationId);

  if (!input.salonBusinessId || offer.business_id !== input.salonBusinessId) {
    throw new Error("Dieser Termin gehört nicht zu deinem Salon.");
  }

  if (!booking?.id || !booking.requested_slot_id) {
    throw new Error("Für diesen Termin liegt keine Verschiebungsanfrage vor.");
  }

  const requestedSlotId = String(booking.requested_slot_id);

  if (!input.accept) {
    const { error } = await admin
      .from("bookings")
      .update({ booking_status: "confirmed", requested_slot_id: null })
      .eq("id", booking.id);

    if (error) {
      const fallback = await admin.from("bookings").update({ requested_slot_id: null }).eq("id", booking.id);
      if (fallback.error) {
        throw new Error(fallback.error.message);
      }
    }

    await createNotification(admin, {
      userId: application.customer_id as string,
      type: "swap_rejected",
      title: "Verschiebung abgelehnt",
      message: `Der Salon bleibt bei der ursprünglichen Zeit für „${offer.title}“. Dein Termin gilt unverändert.`,
      applicationId: application.id as string,
      offerId: application.offer_id as string,
    });

    return { accepted: false };
  }

  const { data: requestedSlot } = await admin
    .from("offer_slots")
    .select("id, start_time, is_booked")
    .eq("id", requestedSlotId)
    .maybeSingle();

  if (!requestedSlot) {
    throw new Error("Der gewünschte Slot existiert nicht mehr.");
  }

  const taken = await bookedSlotIds(admin, [requestedSlotId]);
  if (taken.has(requestedSlotId) || requestedSlot.is_booked) {
    throw new Error("Der gewünschte Slot ist inzwischen vergeben.");
  }

  const { error: swapError } = await admin
    .from("bookings")
    .update({ slot_id: requestedSlotId, booking_status: "confirmed", requested_slot_id: null })
    .eq("id", booking.id);

  if (swapError) {
    throw new Error(swapError.message);
  }

  await admin.from("offer_slots").update({ is_booked: true }).eq("id", requestedSlotId);
  if (currentSlotId && currentSlotId !== requestedSlotId) {
    await admin.from("offer_slots").update({ is_booked: false }).eq("id", currentSlotId);
  }

  const notes = String(application.notes ?? "");
  await admin
    .from("applications")
    .update({ notes: notesWithSlotRef(notes, requestedSlotId, String(requestedSlot.start_time)) })
    .eq("id", application.id);

  await refreshOfferAvailability(admin, application.offer_id as string);

  await createNotification(admin, {
    userId: application.customer_id as string,
    type: "swap_accepted",
    title: "Verschiebung bestätigt",
    message: `Dein Termin „${offer.title}“ liegt jetzt am ${formatSlot(String(requestedSlot.start_time))}.`,
    applicationId: application.id as string,
    offerId: application.offer_id as string,
  });

  return { accepted: true, start_time: String(requestedSlot.start_time) };
}
