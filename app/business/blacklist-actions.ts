"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { isCustomerBlocked, setCustomerBlocked } from "@/lib/blacklist/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { readId } from "@/lib/security/sanitize";

export type BlacklistState = {
  error?: string;
  blocked?: boolean;
};

export async function toggleBlacklistAction(
  _prev: BlacklistState,
  formData: FormData,
): Promise<BlacklistState> {
  const { business } = await requireBusiness();
  const customerId = readId(formData, "customer_id");

  if (!business?.id) {
    return { error: "Kein Salonprofil gefunden." };
  }

  if (!customerId) {
    return { error: "Modell fehlt." };
  }

  const admin = createAdminClient();

  try {
    const currently = await isCustomerBlocked(admin, business.id, customerId);
    const blocked = await setCustomerBlocked(admin, business.id, customerId, !currently);

    revalidatePath("/business/dashboard");
    revalidatePath("/business/applications");
    revalidatePath("/dashboard");
    return { blocked };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sperre fehlgeschlagen." };
  }
}
