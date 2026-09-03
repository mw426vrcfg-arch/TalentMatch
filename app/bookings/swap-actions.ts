"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { requireCustomer } from "@/lib/auth/require-customer";
import { loadSwapCandidates, requestSlotSwap, resolveSlotSwap, type SwapSlot } from "@/lib/bookings/swap";
import { readId } from "@/lib/security/sanitize";

export type SwapState = {
  error?: string;
  success?: string;
};

function revalidateBoth() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/applications");
  revalidatePath("/business/offers");
}

export async function loadSwapSlotsAction(
  applicationId: string,
): Promise<{ slots: SwapSlot[]; error?: string }> {
  const { user } = await requireCustomer();

  try {
    return { slots: await loadSwapCandidates(user.id, applicationId) };
  } catch (error) {
    return {
      slots: [],
      error: error instanceof Error ? error.message : "Freie Slots konnten nicht geladen werden.",
    };
  }
}

export async function requestSlotSwapAction(
  _prev: SwapState,
  formData: FormData,
): Promise<SwapState> {
  const { user } = await requireCustomer();
  const applicationId = readId(formData, "application_id");
  const requestedSlotId = readId(formData, "requested_slot_id");

  if (!applicationId || !requestedSlotId) {
    return { error: "Bitte eine Wunschzeit auswählen." };
  }

  try {
    await requestSlotSwap({ customerId: user.id, applicationId, requestedSlotId });
    revalidateBoth();
    return { success: "Anfrage gesendet. Der Salon entscheidet." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Anfrage fehlgeschlagen." };
  }
}

export async function resolveSlotSwapAction(
  _prev: SwapState,
  formData: FormData,
): Promise<SwapState> {
  const { business } = await requireBusiness();
  const applicationId = readId(formData, "application_id");
  const accept = String(formData.get("decision") ?? "") === "accept";

  if (!applicationId) {
    return { error: "Termin fehlt." };
  }

  try {
    await resolveSlotSwap({
      salonBusinessId: business?.id ?? null,
      applicationId,
      accept,
    });
    revalidateBoth();
    return { success: accept ? "Termin verschoben." : "Verschiebung abgelehnt." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Aktion fehlgeschlagen." };
  }
}
