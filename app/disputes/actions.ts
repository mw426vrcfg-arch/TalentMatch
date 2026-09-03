"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { requireCustomer } from "@/lib/auth/require-customer";
import { createDispute } from "@/lib/disputes/store";
import { readId, readText, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export type DisputeFormState = {
  error?: string;
  success?: string;
};

async function fileDispute(reporterId: string, formData: FormData, path: string): Promise<DisputeFormState> {
  const applicationId = readId(formData, "application_id");
  const bookingId = readId(formData, "booking_id") || null;
  const reportedUserId = readId(formData, "reported_user_id");
  const description = readText(formData, "description", TEXT_LIMITS.notes);

  if (!applicationId || !reportedUserId) {
    return { error: "Termin konnte nicht zugeordnet werden." };
  }
  if (description.length < 12) {
    return { error: "Bitte den Vorfall in ein paar Sätzen beschreiben (mind. 12 Zeichen)." };
  }
  if (description.length > 2000) {
    return { error: "Bitte kürze die Beschreibung auf 2000 Zeichen." };
  }

  const admin = createAdminClient();
  const { data: application, error } = await admin
    .from("applications")
    .select("id, customer_id, offer_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    return { error: error?.message ?? "Termin nicht gefunden." };
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, business_id")
    .eq("id", application.offer_id)
    .maybeSingle();
  const { data: business } = offer
    ? await admin.from("business_profiles").select("id, user_id").eq("id", offer.business_id).maybeSingle()
    : { data: null };
  const salonUserId = String(business?.user_id || business?.id || offer?.business_id || "");
  const customerId = String(application.customer_id);
  const allowed =
    reporterId === customerId ||
    reporterId === salonUserId ||
    reporterId === String(business?.id ?? "");
  if (!allowed) {
    return { error: "Du kannst nur Termine aus deinem Konto melden." };
  }

  const counterpart = reporterId === customerId ? salonUserId || reportedUserId : customerId;

  try {
    await createDispute(admin, {
      reporterId,
      reportedUserId: counterpart,
      applicationId,
      bookingId,
      description,
    });
  } catch (submitError) {
    const message = submitError instanceof Error ? submitError.message : "";
    if (/does not exist|schema cache/i.test(message)) {
      return { error: "Die Melde-Tabelle ist noch nicht eingerichtet. Bitte disputes.sql in Supabase ausführen." };
    }
    return { error: message || "Meldung konnte nicht gespeichert werden." };
  }

  revalidatePath(path);
  return { success: "Danke. Deine Meldung liegt beim Plattform-Admin." };
}

export async function reportCustomerDisputeAction(
  _prev: DisputeFormState,
  formData: FormData,
): Promise<DisputeFormState> {
  const { user } = await requireCustomer();
  return fileDispute(user.id, formData, "/dashboard");
}

export async function reportSalonDisputeAction(
  _prev: DisputeFormState,
  formData: FormData,
): Promise<DisputeFormState> {
  const { user } = await requireBusiness();
  return fileDispute(user.id, formData, "/business/dashboard");
}
