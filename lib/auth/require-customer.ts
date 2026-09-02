import { redirect } from "next/navigation";
import { ensureProfile, getProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { getStrikeRestriction } from "@/lib/strikes/restriction";

export async function requireCustomer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = (await getProfile(user.id)) ?? (await ensureProfile(user));

  if (profile.role === "business") {
    redirect("/business/dashboard");
  }

  const restriction = await getStrikeRestriction(user.id);
  if (restriction.banned) {
    await supabase.auth.signOut();
    redirect("/login?error=strikes");
  }

  return { user, profile, strikes: restriction.count };
}

export async function getOptionalProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (await getProfile(user.id)) ?? (await ensureProfile(user));
}
