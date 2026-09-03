"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { requireCustomer } from "@/lib/auth/require-customer";
import { cancelAppointment } from "@/lib/bookings/cancel";
import { readId } from "@/lib/security/sanitize";

export type CancelAppointmentState = {
  error?: string;
};

export async function cancelAppointmentAsCustomerAction(
  _prev: CancelAppointmentState,
  formData: FormData,
): Promise<CancelAppointmentState> {
  const { user } = await requireCustomer();
  const applicationId = readId(formData, "application_id");
  if (!applicationId) {
    return { error: "Termin fehlt." };
  }

  try {
    await cancelAppointment({
      actorId: user.id,
      role: "customer",
      applicationId,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/applications");
    revalidatePath("/business/dashboard");
    revalidatePath("/business/applications");
    revalidatePath("/business/offers");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stornierung fehlgeschlagen." };
  }
}

export async function cancelAppointmentAsSalonAction(
  _prev: CancelAppointmentState,
  formData: FormData,
): Promise<CancelAppointmentState> {
  const { user, business } = await requireBusiness();
  const applicationId = readId(formData, "application_id");
  if (!applicationId) {
    return { error: "Termin fehlt." };
  }

  try {
    await cancelAppointment({
      actorId: user.id,
      role: "salon",
      applicationId,
      salonBusinessId: business?.id ?? null,
    });
    revalidatePath("/business/dashboard");
    revalidatePath("/business/applications");
    revalidatePath("/business/offers");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/applications");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stornierung fehlgeschlagen." };
  }
}
