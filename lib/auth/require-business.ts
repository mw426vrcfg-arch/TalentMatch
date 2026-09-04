import { redirect } from "next/navigation";
import { ensureProfile, getProfile, profileFromUser } from "@/lib/auth/ensure-profile";
import { loadBusinessProfileByUserId, type BusinessProfile } from "@/lib/business/profile-store";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
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

  let profile;
  try {
    profile = (await getProfile(user.id)) ?? (await ensureProfile(user));
  } catch (error) {
    console.warn(
      "Salon-Nutzerprofil nicht verfügbar:",
      error instanceof Error ? error.message : error,
    );
    profile = profileFromUser(user);
  }

  if (profile.role !== "business" && profile.role !== "admin") {
    redirect("/dashboard");
  }

  let business = null;
  try {
    const admin = tryCreateAdminClient();
    if (admin) {
      const loaded = await loadBusinessProfileByUserId(admin, user.id);
      business = loaded.profile;
    }
  } catch (error) {
    console.warn(
      "Salonprofil nach Login nicht verfügbar:",
      error instanceof Error ? error.message : error,
    );
  }

  return { user, profile, business };
}
