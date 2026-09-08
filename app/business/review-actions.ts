"use server";

import { revalidatePath } from "next/cache";
import {
  isCustomTimeRequest,
  notesWithFinalTime,
  officialConfirmChatMessage,
  parseCustomTimeNotes,
  REQUESTED_CUSTOM_TIME,
} from "@/lib/applications/custom-time";
import { notesWithSlotRef, parseSlotIdFromNotes } from "@/lib/applications/slot-from-notes";
import { requireBusiness } from "@/lib/auth/require-business";
import { insertChatMessage, type ChatMessage } from "@/lib/messages/store";
import { revalidatePublicOffers } from "@/lib/offers/public-cache";
import { createNotification } from "@/lib/notifications/create";
import { refreshOfferAvailability } from "@/lib/offers/availability";
import { formatAppointmentWhen } from "@/lib/offers/format";
import { parseDateTimeLocalToIso } from "@/lib/offers/slot-schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { readId } from "@/lib/security/sanitize";
import { insertFlexible, missingColumnFromError } from "@/lib/supabase/flexible-write";

export type ReviewState = {
  error?: string;
  ok?: boolean;
  confirmMessage?: ChatMessage;
};

function isNextControlFlowError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const digest = String((error as { digest?: unknown }).digest);
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

function parseConfirmedStart(formData: FormData) {
  return parseDateTimeLocalToIso(String(formData.get("confirmed_start") ?? ""));
}

async function updateDroppingMissingColumns(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  payload: Record<string, unknown>,
  matchColumn: string,
  matchValue: string,
) {
  const next: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (Object.keys(next).length === 0) {
      return;
    }
    const { error } = await admin.from(table).update(next).eq(matchColumn, matchValue);
    if (!error) {
      return;
    }
    const column = missingColumnFromError(error.message);
    if (!column || !(column in next)) {
      throw new Error(error.message);
    }
    delete next[column];
  }
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
  try {
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
    const slotStartIso = start.toISOString();
    const slotEndIso = new Date(start.getTime() + durationMinutes * 60 * 1000).toISOString();
    const when = formatAppointmentWhen(slotStartIso);

    const { data: slot, error: slotError } = await admin
      .from("offer_slots")
      .insert({
        offer_id: application.offer_id,
        start_time: slotStartIso,
        end_time: slotEndIso,
        is_booked: true,
      })
      .select("id, start_time")
      .single();

    if (slotError || !slot) {
      return { error: slotError?.message ?? "Der Termin konnte nicht angelegt werden." };
    }

    const customTime =
      parseCustomTimeNotes(application.notes, application.custom_time_notes) ?? application.notes ?? "";
    const notes = notesWithSlotRef(
      notesWithFinalTime(application.notes ?? customTime, when),
      slot.id as string,
      slot.start_time as string,
    );

    const updatePayload: Record<string, unknown> = {
      status: "accepted",
      notes,
      final_time: when,
    };

    let acceptErrorMessage: string | null = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error: acceptError } = await admin
        .from("applications")
        .update(updatePayload)
        .eq("id", application.id);
      if (!acceptError) {
        acceptErrorMessage = null;
        break;
      }
      const column = missingColumnFromError(acceptError.message);
      if (!column || !(column in updatePayload)) {
        acceptErrorMessage = acceptError.message;
        break;
      }
      delete updatePayload[column];
    }

    if (acceptErrorMessage) {
      await admin.from("offer_slots").delete().eq("id", slot.id);
      return { error: acceptErrorMessage };
    }

    try {
      await insertFlexible(admin, "bookings", {
        application_id: application.id,
        slot_id: slot.id,
        payment_status: "pending",
        booking_status: "confirmed",
        deposit_amount: 0,
        platform_fee: 0,
        salon_payout: 0,
        scheduled_at: slotStartIso,
        start_time: slotStartIso,
      });
    } catch (bookingError) {
      const message =
        bookingError instanceof Error ? bookingError.message : "Die Buchung konnte nicht angelegt werden.";
      if (!message.toLowerCase().includes("duplicate")) {
        await admin.from("applications").update({ status: application.status }).eq("id", application.id);
        await admin.from("offer_slots").update({ is_booked: false }).eq("id", slot.id);
        return { error: message };
      }
    }

    try {
      await updateDroppingMissingColumns(
        admin,
        "bookings",
        { scheduled_at: slotStartIso, start_time: slotStartIso },
        "application_id",
        application.id,
      );
    } catch (scheduleError) {
      console.warn(
        "Buchungszeit konnte nicht extra gespeichert werden:",
        scheduleError instanceof Error ? scheduleError.message : scheduleError,
      );
    }

    let confirmMessage: ChatMessage | undefined;

    try {
      confirmMessage = await insertChatMessage(admin, {
        applicationId: application.id,
        senderId: user.id,
        body: officialConfirmChatMessage(when),
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
    return { ok: true, confirmMessage };
  } catch (error) {
    if (isNextControlFlowError(error)) {
      throw error;
    }
    console.error("Finalen Termin festlegen fehlgeschlagen:", error);
    return {
      error: error instanceof Error ? error.message : "Der Termin konnte nicht gespeichert werden.",
    };
  }
}
