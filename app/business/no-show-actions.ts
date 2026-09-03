"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/require-business";
import { createNotification } from "@/lib/notifications/create";
import { createAdminClient } from "@/lib/supabase/admin";
import { banCustomerLogin, getStrikeRestriction } from "@/lib/strikes/restriction";
import { readId } from "@/lib/security/sanitize";

export type NoShowState = {
  error?: string;
  success?: string;
};

export async function reportNoShowAction(
  _prev: NoShowState,
  formData: FormData,
): Promise<NoShowState> {
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
    .select("id, application_id, slot_id, booking_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { error: bookingError?.message ?? "Termin nicht gefunden." };
  }

  if (booking.booking_status !== "confirmed") {
    return { error: "No-Show kann nur bei bestätigten Terminen gemeldet werden." };
  }

  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, customer_id, offer_id")
    .eq("id", booking.application_id)
    .maybeSingle();

  if (applicationError || !application) {
    return { error: "Bewerbung zum Termin nicht gefunden." };
  }

  const { data: offer } = await admin
    .from("offers")
    .select("business_id")
    .eq("id", application.offer_id)
    .maybeSingle();

  if (!offer || offer.business_id !== business.id) {
    return { error: "Dieser Termin gehört nicht zu deinem Salon." };
  }

  const { error: statusError } = await admin
    .from("bookings")
    .update({ booking_status: "no_show" })
    .eq("id", booking.id);

  if (statusError) {
    return { error: statusError.message };
  }

  const { error: strikeError } = await admin.from("strikes").insert({
    customer_id: application.customer_id,
    reason: "no-show",
    active: true,
  });

  if (strikeError) {
    await admin.from("bookings").update({ booking_status: "confirmed" }).eq("id", booking.id);
    return { error: strikeError.message };
  }

  const restriction = await getStrikeRestriction(application.customer_id as string);
  const count = restriction.count;

  if (count >= 3) {
    await banCustomerLogin(application.customer_id as string);
    await createNotification(admin, {
      userId: application.customer_id as string,
      type: "application_rejected",
      title: "Konto gesperrt",
      message: "Du hast 3 aktive Strikes wegen No-Shows. Dein Login ist dauerhaft gesperrt.",
      applicationId: application.id as string,
      offerId: application.offer_id as string,
    });
  } else if (count === 2) {
    await createNotification(admin, {
      userId: application.customer_id as string,
      type: "application_rejected",
      title: "Zweiter Strike",
      message: "No-Show gemeldet: 2 von 3 Strikes. Ein weiterer Strike sperrt deinen Login dauerhaft.",
      applicationId: application.id as string,
      offerId: application.offer_id as string,
    });
  } else {
    await createNotification(admin, {
      userId: application.customer_id as string,
      type: "application_rejected",
      title: "Strike wegen No-Show",
      message: "Der Salon hat einen No-Show gemeldet. Strike 1 von 3 — das ist eine Warnung.",
      applicationId: application.id as string,
      offerId: application.offer_id as string,
    });
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/dashboard");
  redirect(`/business/dashboard?noshow=${count}`);
}
