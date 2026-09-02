import { createAdminClient } from "@/lib/supabase/admin";

export type ConfirmedBooking = {
  id: string;
  start_time: string;
  offer_title: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  application_id: string;
  active_strikes: number;
};

export async function loadSalonConfirmedBookings(businessId: string) {
  const admin = createAdminClient();
  const { data: offers, error: offerError } = await admin
    .from("offers")
    .select("id, title")
    .eq("business_id", businessId);

  if (offerError) {
    throw new Error(offerError.message);
  }

  const offerRows = offers ?? [];
  if (offerRows.length === 0) {
    return [] as ConfirmedBooking[];
  }

  const offerTitle = new Map(offerRows.map((offer) => [offer.id as string, offer.title as string]));
  const offerIds = offerRows.map((offer) => offer.id as string);

  const { data: applications, error: applicationError } = await admin
    .from("applications")
    .select("id, customer_id, offer_id")
    .in("offer_id", offerIds)
    .eq("status", "accepted");

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  const applicationRows = applications ?? [];
  if (applicationRows.length === 0) {
    return [] as ConfirmedBooking[];
  }

  const applicationIds = applicationRows.map((row) => row.id as string);
  const { data: bookings, error: bookingError } = await admin
    .from("bookings")
    .select("id, application_id, slot_id, booking_status")
    .in("application_id", applicationIds)
    .eq("booking_status", "confirmed");

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  const bookingRows = bookings ?? [];
  if (bookingRows.length === 0) {
    return [] as ConfirmedBooking[];
  }

  const slotIds = bookingRows.map((row) => row.slot_id as string);
  const customerIds = [...new Set(applicationRows.map((row) => row.customer_id as string))];

  const [{ data: slots }, { data: users }, { data: strikes }] = await Promise.all([
    admin.from("offer_slots").select("id, start_time").in("id", slotIds),
    admin.from("users").select("id, full_name, email").in("id", customerIds),
    admin.from("strikes").select("customer_id").eq("active", true).in("customer_id", customerIds),
  ]);

  const slotMap = new Map((slots ?? []).map((slot) => [slot.id as string, slot.start_time as string]));
  const userMap = new Map((users ?? []).map((user) => [user.id as string, user]));
  const strikeCounts = new Map<string, number>();
  for (const strike of strikes ?? []) {
    const id = String(strike.customer_id);
    strikeCounts.set(id, (strikeCounts.get(id) ?? 0) + 1);
  }

  const applicationMap = new Map(applicationRows.map((row) => [row.id as string, row]));

  return bookingRows
    .map((booking) => {
      const application = applicationMap.get(booking.application_id as string);
      if (!application) {
        return null;
      }

      const customerId = application.customer_id as string;
      const user = userMap.get(customerId);

      return {
        id: booking.id as string,
        start_time: slotMap.get(booking.slot_id as string) ?? new Date().toISOString(),
        offer_title: offerTitle.get(application.offer_id as string) ?? "Angebot",
        customer_id: customerId,
        customer_name: (user?.full_name as string | undefined) || "Kunde",
        customer_email: (user?.email as string | undefined) || "",
        application_id: application.id as string,
        active_strikes: strikeCounts.get(customerId) ?? 0,
      };
    })
    .filter((row): row is ConfirmedBooking => row !== null)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}
