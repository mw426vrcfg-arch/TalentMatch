import { parseSlotIdFromNotes, parseSlotStartFromNotes } from "@/lib/applications/slot-from-notes";
import { isLateCancellation } from "@/lib/bookings/cancel-window";
import { insertChatMessage } from "@/lib/messages/store";
import { createNotification, type NotificationType } from "@/lib/notifications/create";
import { refreshOfferAvailability } from "@/lib/offers/availability";
import { banCustomerLogin, getStrikeRestriction } from "@/lib/strikes/restriction";
import { createAdminClient } from "@/lib/supabase/admin";

const CANCEL_REASON_LABEL: Record<string, string> = {
  illness: "Krankheit",
  conflict: "Terminkonflikt",
  other: "Sonstiges",
};

type Admin = ReturnType<typeof createAdminClient>;

async function updateApplicationStatus(admin: Admin, applicationId: string, preferred: string) {
  const candidates = [preferred, "rejected"];
  let lastError: string | null = null;

  for (const status of candidates) {
    const { error } = await admin.from("applications").update({ status }).eq("id", applicationId);
    if (!error) {
      return status;
    }
    lastError = error.message;
  }

  throw new Error(lastError ?? "Status konnte nicht aktualisiert werden.");
}

async function releaseSlot(admin: Admin, slotId: string | null) {
  if (!slotId) {
    return;
  }
  const { error } = await admin.from("offer_slots").update({ is_booked: false }).eq("id", slotId);
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    throw new Error(error.message);
  }
}

async function closeBooking(admin: Admin, bookingId: string | null, slotId: string | null) {
  if (!bookingId) {
    return;
  }

  const { error: statusError } = await admin
    .from("bookings")
    .update({ booking_status: "cancelled" })
    .eq("id", bookingId);

  if (statusError && !/invalid input value|booking_status/i.test(statusError.message)) {
    throw new Error(statusError.message);
  }

  const { data: ratings } = await admin.from("ratings").select("id").eq("booking_id", bookingId).limit(1);
  if (ratings && ratings.length > 0) {
    return;
  }

  const { error: deleteError } = await admin.from("bookings").delete().eq("id", bookingId);
  if (deleteError && slotId) {
    await admin.from("bookings").update({ booking_status: "cancelled" }).eq("id", bookingId);
  }
}

async function addLateCancelStrike(admin: Admin, customerId: string, applicationId: string, offerId: string) {
  const { error } = await admin.from("strikes").insert({
    customer_id: customerId,
    reason: "late-cancellation",
    active: true,
  });
  if (error) {
    const retry = await admin.from("strikes").insert({
      customer_id: customerId,
      reason: "no-show",
      active: true,
    });
    if (retry.error) {
      throw new Error(retry.error.message);
    }
  }

  const restriction = await getStrikeRestriction(customerId);
  if (restriction.count >= 3) {
    await banCustomerLogin(customerId);
    await createNotification(admin, {
      userId: customerId,
      type: "application_rejected",
      title: "Konto gesperrt",
      message: "3 aktive Strikes (inkl. kurzfristiger Stornierung). Dein Login ist gesperrt.",
      applicationId,
      offerId,
    });
  }
}

function formatCancelChat(input: { role: "customer" | "salon"; reason?: string; note?: string; late?: boolean }) {
  const reason = CANCEL_REASON_LABEL[input.reason ?? ""] || input.reason || "Sonstiges";
  const lines = [
    input.role === "salon" ? "Stornierung durch den Salon" : "Stornierung durch das Modell",
    `Grund: ${reason}`,
  ];
  if (input.note?.trim()) {
    lines.push(`Nachricht: ${input.note.trim()}`);
  }
  if (input.late) {
    lines.push("Hinweis: Stornierung weniger als 24 Stunden vor dem Termin (+1 Strike).");
  }
  return lines.join("\n");
}

export async function cancelAppointment(input: {
  actorId: string;
  role: "customer" | "salon";
  applicationId: string;
  salonBusinessId?: string | null;
  reason?: string;
  note?: string;
}) {
  const admin = createAdminClient();
  const { data: application, error } = await admin
    .from("applications")
    .select("id, customer_id, offer_id, notes, status")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new Error(error?.message ?? "Termin nicht gefunden.");
  }

  if (application.status !== "accepted") {
    throw new Error("Nur bestätigte Termine können storniert werden.");
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, title, business_id")
    .eq("id", application.offer_id)
    .maybeSingle();

  if (!offer) {
    throw new Error("Angebot nicht gefunden.");
  }

  if (input.role === "customer" && application.customer_id !== input.actorId) {
    throw new Error("Dieser Termin gehört nicht zu dir.");
  }

  if (input.role === "salon") {
    if (!input.salonBusinessId || offer.business_id !== input.salonBusinessId) {
      throw new Error("Dieser Termin gehört nicht zu deinem Salon.");
    }
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id, slot_id, booking_status")
    .eq("application_id", application.id)
    .maybeSingle();

  if (booking?.booking_status === "completed" || booking?.booking_status === "no_show") {
    throw new Error("Abgeschlossene Termine können nicht storniert werden.");
  }

  const slotId =
    (booking?.slot_id as string | null | undefined) || parseSlotIdFromNotes(application.notes as string | null);

  let startIso = parseSlotStartFromNotes(application.notes as string | null);
  if (slotId) {
    const { data: slot } = await admin.from("offer_slots").select("start_time").eq("id", slotId).maybeSingle();
    if (slot?.start_time) {
      startIso = String(slot.start_time);
    }
  }

  if (!startIso) {
    throw new Error("Terminzeit nicht gefunden.");
  }

  const start = new Date(startIso).getTime();
  if (!Number.isNaN(start) && start <= Date.now()) {
    throw new Error("Vergangene Termine können nicht storniert werden.");
  }

  const preferred =
    input.role === "customer" ? "cancelled_by_customer" : "cancelled_by_salon";
  const late = input.role === "customer" && isLateCancellation(startIso);

  try {
    await insertChatMessage(admin, {
      applicationId: application.id as string,
      bookingId: booking?.id ? String(booking.id) : null,
      senderId: input.actorId,
      body: formatCancelChat({
        role: input.role,
        reason: input.reason,
        note: input.note,
        late,
      }),
    });
  } catch (chatError) {
    console.error("Stornierungs-Chat:", chatError);
  }

  await updateApplicationStatus(admin, application.id as string, preferred);
  await closeBooking(admin, booking?.id ? String(booking.id) : null, slotId);
  await releaseSlot(admin, slotId);
  await refreshOfferAvailability(admin, application.offer_id as string);

  const service = String(offer.title ?? "Termin");

  if (late) {
    await addLateCancelStrike(
      admin,
      application.customer_id as string,
      application.id as string,
      application.offer_id as string,
    );
  }

  const cancelType = "booking_cancelled" as NotificationType;

  if (input.role === "salon") {
    await createNotification(admin, {
      userId: application.customer_id as string,
      type: cancelType,
      title: "Dringend: Termin storniert",
      message: `Dein Termin „${service}“ wurde vom Salon storniert. Der Slot ist wieder frei.`,
      applicationId: application.id as string,
      offerId: application.offer_id as string,
    });
  } else {
    const { data: business } = await admin
      .from("business_profiles")
      .select("user_id")
      .eq("id", offer.business_id)
      .maybeSingle();
    const salonUserId = (business?.user_id as string | undefined) || (offer.business_id as string);
    await createNotification(admin, {
      userId: salonUserId,
      type: cancelType,
      title: late ? "Kurzfristige Stornierung" : "Termin storniert",
      message: late
        ? `Ein Modell hat „${service}“ weniger als 24 Stunden vorher storniert. Der Slot ist wieder frei.`
        : `Ein Modell hat „${service}“ storniert. Der Slot ist wieder frei.`,
      applicationId: application.id as string,
      offerId: application.offer_id as string,
    });
  }

  return { late };
}
