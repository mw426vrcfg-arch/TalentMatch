"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/require-business";
import { awardCompletedVisitPoints } from "@/lib/loyalty/store";
import { createNotification } from "@/lib/notifications/create";
import { createAdminClient } from "@/lib/supabase/admin";
import { readId } from "@/lib/security/sanitize";

export type CompleteBookingState = {
  error?: string;
};

export async function completeBookingAction(
  _prev: CompleteBookingState,
  formData: FormData,
): Promise<CompleteBookingState> {
  const { business } = await requireBusiness();
  if (!business) {
    return { error: "Kein Salonprofil gefunden." };
  }

  const bookingId = readId(formData, "booking_id");
  if (!bookingId) {
    return { error: "Termin fehlt." };
  }

  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, application_id, booking_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { error: bookingError?.message ?? "Termin nicht gefunden." };
  }

  if (booking.booking_status !== "confirmed") {
    return { error: "Nur bestätigte Termine können abgeschlossen werden." };
  }

  const { data: application } = await admin
    .from("applications")
    .select("id, customer_id, offer_id")
    .eq("id", booking.application_id)
    .maybeSingle();

  if (!application) {
    return { error: "Bewerbung zum Termin nicht gefunden." };
  }

  const { data: offer } = await admin
    .from("offers")
    .select("business_id, title")
    .eq("id", application.offer_id)
    .maybeSingle();

  if (!offer || offer.business_id !== business.id) {
    return { error: "Dieser Termin gehört nicht zu deinem Salon." };
  }

  const { error } = await admin
    .from("bookings")
    .update({ booking_status: "completed" })
    .eq("id", booking.id);

  if (error) {
    return { error: error.message };
  }

  await awardCompletedVisitPoints(admin, application.customer_id as string);

  await createNotification(admin, {
    userId: application.customer_id as string,
    type: "booking_confirmed",
    title: "Bitte bewerten",
    message: `Dein Termin „${offer.title}“ ist abgeschlossen. Bewerte jetzt den Salon (1–5 Sterne).`,
    applicationId: application.id as string,
    offerId: application.offer_id as string,
  });

  revalidatePath("/business/dashboard");
  revalidatePath("/dashboard");
  redirect("/business/dashboard?completed=1");
}
