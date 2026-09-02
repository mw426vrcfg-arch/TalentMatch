"use server";

import { revalidatePath } from "next/cache";
import { parseSlotIdFromNotes } from "@/lib/applications/slot-from-notes";
import { requireBusiness } from "@/lib/auth/require-business";
import { createNotification } from "@/lib/notifications/create";
import { formatAppointmentWhen } from "@/lib/offers/format";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewState = {
  error?: string;
};

async function loadOwnedApplication(applicationId: string, businessId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("applications")
    .select("id, status, notes, offer_id, customer_id")
    .eq("id", applicationId)
    .maybeSingle();

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
    },
    error: null,
  };
}

async function refreshOfferAvailability(
  admin: ReturnType<typeof createAdminClient>,
  offerId: string,
) {
  const { data: openSlots } = await admin
    .from("offer_slots")
    .select("id")
    .eq("offer_id", offerId)
    .eq("is_booked", false);

  await admin
    .from("offers")
    .update({ status: openSlots && openSlots.length > 0 ? "active" : "full" })
    .eq("id", offerId);
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

  const applicationId = String(formData.get("application_id") ?? "").trim();
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

  if (application.status !== "pending") {
    return { error: "Diese Bewerbung wurde bereits entschieden." };
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

      if (slot.is_booked) {
        return { error: "Dieser Slot ist bereits reserviert." };
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
        title: "Bewerbung angenommen",
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
        title: "Bewerbung angenommen",
        message: "Dein Termin am gewählten Slot wurde bestätigt!",
        applicationId: application.id,
        offerId: application.offer_id,
      });
    }

    await refreshOfferAvailability(admin, application.offer_id);
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/offers");
  return {};
}
