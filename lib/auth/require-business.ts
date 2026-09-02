import { redirect } from "next/navigation";
import { ensureProfile, getProfile } from "@/lib/auth/ensure-profile";
import { loadBusinessProfileByUserId, type BusinessProfile } from "@/lib/business/profile-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type { BusinessProfile };

export async function requireBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = (await getProfile(user.id)) ?? (await ensureProfile(user));

  if (profile.role !== "business" && profile.role !== "admin") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { profile: business } = await loadBusinessProfileByUserId(admin, user.id);

  return { user, profile, business };
}
