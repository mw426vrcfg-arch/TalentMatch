"use server";

import { revalidatePath } from "next/cache";
import {
  isCustomTimeRequest,
  parseCustomTimeNotes,
  REQUESTED_CUSTOM_TIME,
} from "@/lib/applications/custom-time";
import { notesWithSlotRef, parseSlotIdFromNotes } from "@/lib/applications/slot-from-notes";
import { requireBusiness } from "@/lib/auth/require-business";
import { insertChatMessage } from "@/lib/messages/store";
import { revalidatePublicOffers } from "@/lib/offers/public-cache";
import { createNotification } from "@/lib/notifications/create";
import { refreshOfferAvailability } from "@/lib/offers/availability";
import { formatAppointmentWhen } from "@/lib/offers/format";
import { combineLocalDateTime } from "@/lib/offers/slot-schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { readId } from "@/lib/security/sanitize";

export type ReviewState = {
  error?: string;
  ok?: boolean;
};

function parseConfirmedStart(formData: FormData) {
  const raw = String(formData.get("confirmed_start") ?? "").trim();
  const [date, time] = raw.split("T");
  return combineLocalDateTime(date ?? "", time ?? "");
}

function revalidateAfterReview(offerId: string) {
  revalidatePath("/business/dashboard");
  revalidatePath("/business/applications");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  revalidatePublicOffers();
}

async function loadOwnedApplication(applicationId: string, businessId: string) {
  const admin = createAdminClient();
  const first = await admin
    .from("applications")
    .select("id, status, notes, offer_id, customer_id, custom_time_notes")
    .eq("id", applicationId)
    .maybeSingle();

  const query =
    first.error && /custom_time_notes/i.test(first.error.message)
      ? await admin
          .from("applications")
          .select("id, status, notes, offer_id, customer_id")
          .eq("id", applicationId)
          .maybeSingle()
      : first;

  const { data, error } = query;

  if (error || !data) {
    return { admin, application: null as null, error: error?.message ?? "Bewerbung nicht gefunden." };
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, business_id")
    .eq("id", data.offer_id)
    .maybeSingle();

  if (!offer || offer.business_id !== businessId) {
    return { admin, application: null, error: "Diese Bewerbung gehört nicht zu deinem Salon." };
  }

  return {
    admin,
    application: {
      id: data.id as string,
      status: data.status as string,
      slot_id: parseSlotIdFromNotes(data.notes as string | null),
      offer_id: data.offer_id as string,
      customer_id: data.customer_id as string,
      notes: (data.notes as string | null) ?? null,
      custom_time_notes:
        "custom_time_notes" in data
          ? ((data.custom_time_notes as string | null | undefined) ?? null)
          : null,
    },
    error: null,
  };
}

async function rejectOtherApplicationsForSlot(
  admin: ReturnType<typeof createAdminClient>,
  offerId: string,
  slotId: string,
  acceptedId: string,
) {
  const { data: pending } = await admin
    .from("applications")
    .select("id, notes, customer_id")
    .eq("offer_id", offerId)
    .eq("status", "pending")
    .neq("id", acceptedId);

  const competing = (pending ?? []).filter(
    (row) => parseSlotIdFromNotes(row.notes as string | null) === slotId,
  );

  if (competing.length === 0) {
    return;
  }

  await admin
    .from("applications")
    .update({ status: "rejected" })
    .in(
      "id",
      competing.map((row) => row.id as string),
    );

  for (const row of competing) {
    await createNotification(admin, {
      userId: row.customer_id as string,
      type: "application_rejected",
      title: "Bewerbung nicht berücksichtigt",
      message: "Dieser Termin wurde an eine andere Bewerbung vergeben.",
      applicationId: row.id as string,
      offerId,
    });
  }
}

export async function reviewApplicationAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const { business } = await requireBusiness();

  if (!business) {
    return { error: "Kein Salonprofil gefunden." };
  }

  const applicationId = readId(formData, "application_id");
  const decision = String(formData.get("decision") ?? "").trim();

  if (!applicationId || (decision !== "accepted" && decision !== "rejected")) {
    return { error: "Ungültige Entscheidung." };
  }

  const { admin, application, error } = await loadOwnedApplication(
    applicationId,
    business.id,
  );

  if (!application || error) {
    return { error: error ?? "Bewerbung nicht gefunden." };
  }

  if (
    application.status !== "pending" &&
    application.status !== REQUESTED_CUSTOM_TIME &&
    !isCustomTimeRequest(application.status, application.notes, application.custom_time_notes)
  ) {
    return { error: "Diese Bewerbung wurde bereits entschieden." };
  }

  if (decision === "accepted" && isCustomTimeRequest(application.status, application.notes, application.custom_time_notes)) {
    return { error: "Bitte den Wunschtermin im Chat mit einer konkreten Uhrzeit bestätigen." };
  }

  if (decision === "rejected") {
    const { error: updateError } = await admin
      .from("applications")
      .update({ status: "rejected" })
      .eq("id", application.id);

    if (updateError) {
      return { error: updateError.message };
    }

    await createNotification(admin, {
      userId: application.customer_id,
      type: "application_rejected",
      title: "Bewerbung abgelehnt",
      message: "Der Salon hat deine Bewerbung abgelehnt.",
      applicationId: application.id,
      offerId: application.offer_id,
    });
  } else {
    if (application.slot_id) {
      const { data: slot } = await admin
        .from("offer_slots")
        .select("id, is_booked")
        .eq("id", application.slot_id)
        .maybeSingle();

      if (!slot) {
        return { error: "Der gewünschte Slot existiert nicht mehr." };
      }

      const { data: existingBooking } = await admin
        .from("bookings")
        .select("id")
        .eq("slot_id", application.slot_id)
        .maybeSingle();

      if (slot.is_booked || existingBooking) {
        return { error: "Diese Zeit ist bereits ausgebucht." };
      }
    }

    const { error: acceptError } = await admin
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", application.id);

    if (acceptError) {
      return { error: acceptError.message };
    }

    if (application.slot_id) {
      const { error: slotError } = await admin
        .from("offer_slots")
        .update({ is_booked: true })
        .eq("id", application.slot_id);

      if (slotError) {
        await admin.from("applications").update({ status: "pending" }).eq("id", application.id);
        return { error: slotError.message };
      }

      const { data: slot } = await admin
        .from("offer_slots")
        .select("start_time")
        .eq("id", application.slot_id)
        .maybeSingle();

      const { error: bookingError } = await admin.from("bookings").insert({
        application_id: application.id,
        slot_id: application.slot_id,
        payment_status: "pending",
        booking_status: "confirmed",
        deposit_amount: 0,
        platform_fee: 0,
        salon_payout: 0,
      });

      if (bookingError && !bookingError.message.toLowerCase().includes("duplicate")) {
        return { error: bookingError.message };
      }

      const when = slot?.start_time ? formatAppointmentWhen(slot.start_time) : "dem gewählten Termin";

      await createNotification(admin, {
        userId: application.customer_id,
        type: "application_accepted",
        title: "Der Salon hat dich angenommen",
        message: `Dein Termin am ${when} wurde bestätigt!`,
        applicationId: application.id,
        offerId: application.offer_id,
      });

      await rejectOtherApplicationsForSlot(
        admin,
        application.offer_id,
        application.slot_id,
        application.id,
      );
    } else {
      await createNotification(admin, {
        userId: application.customer_id,
        type: "application_accepted",
        title: "Der Salon hat dich angenommen",
        message: "Dein Termin zur gewählten Zeit wurde bestätigt!",
        applicationId: application.id,
        offerId: application.offer_id,
      });
    }

    await refreshOfferAvailability(admin, application.offer_id);
  }

  revalidateAfterReview(application.offer_id);
  return {};
}

export async function acceptCustomTimeAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const { user, business } = await requireBusiness();

  if (!business) {
    return { error: "Kein Salonprofil gefunden." };
  }

  const applicationId = readId(formData, "application_id");
  const startIso = parseConfirmedStart(formData);

  if (!applicationId) {
    return { error: "Ungültige Entscheidung." };
  }

  if (!startIso) {
    return { error: "Bitte die bestätigte Uhrzeit setzen." };
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() - 60 * 1000) {
    return { error: "Bitte eine Uhrzeit in der Zukunft wählen." };
  }

  const { admin, application, error } = await loadOwnedApplication(applicationId, business.id);
  if (!application || error) {
    return { error: error ?? "Bewerbung nicht gefunden." };
  }

  if (!isCustomTimeRequest(application.status, application.notes, application.custom_time_notes)) {
    return { error: "Diese Anfrage ist kein Wunschtermin." };
  }

  if (application.status === "accepted" || application.status === "rejected") {
    return { error: "Diese Bewerbung wurde bereits entschieden." };
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, title, duration_minutes")
    .eq("id", application.offer_id)
    .maybeSingle();

  const durationMinutes = Number(offer?.duration_minutes) || 60;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const { data: slot, error: slotError } = await admin
    .from("offer_slots")
    .insert({
      offer_id: application.offer_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_booked: true,
    })
    .select("id, start_time")
    .single();

  if (slotError || !slot) {
    return { error: slotError?.message ?? "Der Termin konnte nicht angelegt werden." };
  }

  const customTime =
    parseCustomTimeNotes(application.notes, application.custom_time_notes) ?? application.notes ?? "";
  const notes = notesWithSlotRef(application.notes ?? customTime, slot.id as string, slot.start_time as string);

  let acceptError = (
    await admin
      .from("applications")
      .update({ status: "accepted", notes })
      .eq("id", application.id)
  ).error;

  if (acceptError && /notes/i.test(acceptError.message)) {
    acceptError = (await admin.from("applications").update({ status: "accepted" }).eq("id", application.id))
      .error;
  }

  if (acceptError) {
    await admin.from("offer_slots").delete().eq("id", slot.id);
    return { error: acceptError.message };
  }

  const { error: bookingError } = await admin.from("bookings").insert({
    application_id: application.id,
    slot_id: slot.id,
    payment_status: "pending",
    booking_status: "confirmed",
    deposit_amount: 0,
    platform_fee: 0,
    salon_payout: 0,
  });

  if (bookingError && !bookingError.message.toLowerCase().includes("duplicate")) {
    await admin.from("applications").update({ status: application.status }).eq("id", application.id);
    await admin.from("offer_slots").update({ is_booked: false }).eq("id", slot.id);
    return { error: bookingError.message };
  }

  const when = formatAppointmentWhen(slot.start_time as string);

  try {
    await insertChatMessage(admin, {
      applicationId: application.id,
      senderId: user.id,
      body: `Wir bestätigen deinen Wunschtermin am ${when}.`,
    });
  } catch (chatError) {
    console.error(
      "Bestätigungsnachricht fehlgeschlagen:",
      chatError instanceof Error ? chatError.message : chatError,
    );
  }

  await createNotification(admin, {
    userId: application.customer_id,
    type: "application_accepted",
    title: "Der Salon hat dich angenommen",
    message: `Dein Termin am ${when} wurde bestätigt!`,
    applicationId: application.id,
    offerId: application.offer_id,
  });

  await refreshOfferAvailability(admin, application.offer_id);
  revalidateAfterReview(application.offer_id);
  return { ok: true };
}
