"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth/require-customer";
import { asGenderOrNull, persistGender } from "@/lib/profile/gender";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateGenderAction(formData: FormData): Promise<void> {
  const { user } = await requireCustomer();
  const admin = createAdminClient();
  await persistGender(admin, {
    table: "customer_profiles",
    matchColumn: "user_id",
    matchValue: user.id,
    gender: asGenderOrNull(formData.get("gender")),
  });

  revalidatePath("/dashboard/profile");
}

export async function updatePushPreferenceAction(enabled: boolean): Promise<void> {
  const { user } = await requireCustomer();
  const admin = createAdminClient();
  const { error } = await admin
    .from("customer_profiles")
    .update({ in_app_push: enabled })
    .eq("user_id", user.id);

  if (error && !/could not find the 'in_app_push' column|schema cache|does not exist/i.test(error.message)) {
    throw new Error(error.message);
  }
}
