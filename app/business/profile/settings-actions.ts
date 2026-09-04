"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { asGenderOrNull, persistGender } from "@/lib/profile/gender";
import { createAdminClient } from "@/lib/supabase/admin";
import { missingColumnFromError } from "@/lib/supabase/flexible-write";

function isMissingSettingsColumn(message: string) {
  return Boolean(missingColumnFromError(message)) || /schema cache|does not exist/i.test(message);
}

export async function updateSalonGenderAction(formData: FormData): Promise<void> {
  const { user, business } = await requireBusiness();
  if (!business) {
    return;
  }

  const gender = asGenderOrNull(formData.get("gender"));
  const admin = createAdminClient();
  await persistGender(admin, {
    table: "business_profiles",
    matchColumn: "id",
    matchValue: business.id,
    gender,
  });
  await persistGender(admin, {
    table: "business_profiles",
    matchColumn: "user_id",
    matchValue: user.id,
    gender,
  });

  revalidatePath("/business/profile");
}

export async function updateSalonPushPreferenceAction(enabled: boolean): Promise<void> {
  const { business } = await requireBusiness();
  if (!business) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("business_profiles")
    .update({ in_app_push: enabled })
    .eq("id", business.id);

  if (error && !isMissingSettingsColumn(error.message)) {
    throw new Error(error.message);
  }
}
