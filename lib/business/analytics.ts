import { parseSlotIdFromNotes } from "@/lib/applications/slot-from-notes";
import { createAdminClient } from "@/lib/supabase/admin";

export type SalonAnalytics = {
  matched_models: number;
  revenue_chf: number;
  utilization_percent: number;
  booked_slots: number;
  total_slots: number;
};

type Admin = ReturnType<typeof createAdminClient>;

const SUCCESS_STATUSES = new Set(["confirmed", "completed"]);

async function loadOfferIds(admin: Admin, businessId: string, userId?: string) {
  const ids = new Set<string>();
  const prices = new Map<string, number>();

  const queries = [
    admin.from("offers").select("id, discount_price").eq("business_id", businessId),
    userId && userId !== businessId
      ? admin.from("offers").select("id, discount_price").eq("business_id", userId)
      : null,
  ];

  for (const query of queries) {
    if (!query) {
      continue;
    }
    const { data, error } = await query;
    if (error) {
      continue;
    }
    for (const offer of data ?? []) {
      const id = offer.id as string;
      ids.add(id);
      prices.set(id, Number(offer.discount_price ?? 0));
    }
  }

  return { offerIds: [...ids], prices };
}

export async function loadSalonAnalytics(
  businessId: string,
  userId?: string,
): Promise<SalonAnalytics> {
  const empty: SalonAnalytics = {
    matched_models: 0,
    revenue_chf: 0,
    utilization_percent: 0,
    booked_slots: 0,
    total_slots: 0,
  };

  const admin = createAdminClient();
  const { offerIds, prices } = await loadOfferIds(admin, businessId, userId);
  if (offerIds.length === 0) {
    return empty;
  }

  const [{ data: slots }, { data: applications, error: applicationError }] = await Promise.all([
    admin.from("offer_slots").select("id, is_booked").in("offer_id", offerIds),
    admin
      .from("applications")
      .select("id, customer_id, offer_id, notes")
      .in("offer_id", offerIds),
  ]);

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  const slotRows = slots ?? [];
  const totalSlots = slotRows.length;
  const bookedFromFlag = slotRows.filter((slot) => slot.is_booked === true).length;

  const applicationRows = applications ?? [];
  if (applicationRows.length === 0) {
    return {
      ...empty,
      booked_slots: bookedFromFlag,
      total_slots: totalSlots,
      utilization_percent: totalSlots === 0 ? 0 : Math.round((bookedFromFlag / totalSlots) * 100),
    };
  }

  const applicationIds = applicationRows.map((row) => row.id as string);
  const { data: bookings, error: bookingError } = await admin
    .from("bookings")
    .select("id, application_id, slot_id, booking_status")
    .in("application_id", applicationIds);

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  const applicationMap = new Map(applicationRows.map((row) => [row.id as string, row]));
  const bookedSlotIds = new Set<string>();
  const matchedCustomers = new Set<string>();
  let revenue = 0;

  for (const booking of bookings ?? []) {
    const status = String(booking.booking_status ?? "");
    if (!SUCCESS_STATUSES.has(status)) {
      continue;
    }
    const application = applicationMap.get(booking.application_id as string);
    if (!application) {
      continue;
    }
    matchedCustomers.add(application.customer_id as string);
    revenue += prices.get(application.offer_id as string) ?? 0;
    const slotId =
      (booking.slot_id as string | null) ||
      parseSlotIdFromNotes(application.notes as string | null);
    if (slotId) {
      bookedSlotIds.add(slotId);
    }
  }

  const bookedSlots = Math.max(bookedFromFlag, bookedSlotIds.size);
  const utilization =
    totalSlots === 0 ? 0 : Math.min(100, Math.round((bookedSlots / totalSlots) * 100));

  return {
    matched_models: matchedCustomers.size,
    revenue_chf: revenue,
    utilization_percent: utilization,
    booked_slots: bookedSlots,
    total_slots: totalSlots,
  };
}
