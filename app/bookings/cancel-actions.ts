"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { requireCustomer } from "@/lib/auth/require-customer";
import { cancelAppointment } from "@/lib/bookings/cancel";
import { readId, readText, TEXT_LIMITS } from "@/lib/security/sanitize";

export type CancelAppointmentState = {
  error?: string;
  success?: boolean;
};

function cancelFields(formData: FormData) {
  return {
    applicationId: readId(formData, "application_id"),
    reason: readText(formData, "reason", 40),
    note: readText(formData, "note", TEXT_LIMITS.shortNote),
  };
}

export async function cancelAppointmentAsCustomerAction(
  _prev: CancelAppointmentState,
  formData: FormData,
): Promise<CancelAppointmentState> {
  const { user } = await requireCustomer();
  const { applicationId, reason, note } = cancelFields(formData);
  if (!applicationId) {
    return { error: "Termin fehlt." };
  }
  if (!reason) {
    return { error: "Bitte wähle einen Stornierungsgrund." };
  }

  try {
    await cancelAppointment({
      actorId: user.id,
      role: "customer",
      applicationId,
      reason,
      note,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/applications");
    revalidatePath("/business/dashboard");
    revalidatePath("/business/applications");
    revalidatePath("/business/offers");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stornierung fehlgeschlagen." };
  }
}

export async function cancelAppointmentAsSalonAction(
  _prev: CancelAppointmentState,
  formData: FormData,
): Promise<CancelAppointmentState> {
  const { user, business } = await requireBusiness();
  const { applicationId, reason, note } = cancelFields(formData);
  if (!applicationId) {
    return { error: "Termin fehlt." };
  }
  if (!reason) {
    return { error: "Bitte wähle einen Stornierungsgrund." };
  }

  try {
    await cancelAppointment({
      actorId: user.id,
      role: "salon",
      applicationId,
      salonBusinessId: business?.id ?? null,
      reason,
      note,
    });
    revalidatePath("/business/dashboard");
    revalidatePath("/business/applications");
    revalidatePath("/business/offers");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/applications");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stornierung fehlgeschlagen." };
  }
}
