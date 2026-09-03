"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/ensure-profile";
import { applyOAuthRole } from "@/lib/auth/oauth-profile";
import { OAUTH_ROLE_COOKIE, isOAuthRole } from "@/lib/auth/oauth-role";
import { readLine, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createClient } from "@/lib/supabase/server";
import { redirectPathForRole } from "@/lib/supabase/env";

export type RoleState = { error?: string };

export async function completeOAuthRoleAction(
  _prev: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const role = readLine(formData, "role", 20);
  const fullName = readLine(formData, "full_name", TEXT_LIMITS.name);
  const businessName = readLine(formData, "business_name", TEXT_LIMITS.name);
  const location = readLine(formData, "location", TEXT_LIMITS.location);

  if (!isOAuthRole(role)) {
    return { error: "Bitte wählen, ob du Kunde oder Salon bist." };
  }

  if (!fullName) {
    return { error: "Bitte deinen Namen angeben." };
  }

  if (role === "business" && (!businessName || !location)) {
    return { error: "Salonname und Standort sind für ein Salon-Konto Pflicht." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const existing = await getProfile(user.id);
  if (existing) {
    redirect(redirectPathForRole(existing.role));
  }

  try {
    await applyOAuthRole(user, { role, fullName, businessName, location });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Profil konnte nicht angelegt werden.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.delete(OAUTH_ROLE_COOKIE);

  redirect(redirectPathForRole(role));
}
