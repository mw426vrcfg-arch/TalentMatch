import { type User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { type UserRole } from "@/lib/supabase/env";

type Profile = {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
};

function metadataRole(user: User): UserRole {
  const role = user.user_metadata?.role;
  if (role === "business" || role === "admin") {
    return role;
  }
  return "customer";
}

export async function ensureProfile(user: User): Promise<Profile> {
  const admin = createAdminClient();
  const role = metadataRole(user);
  const fullName = String(user.user_metadata?.full_name ?? "");
  const phone = user.user_metadata?.phone
    ? String(user.user_metadata.phone)
    : null;

  const { error: userError } = await admin.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      phone,
      role,
    },
    { onConflict: "id" },
  );

  if (userError) {
    throw new Error(userError.message);
  }

  if (role === "business") {
    const businessName =
      String(user.user_metadata?.business_name ?? "").trim() || "Mein Salon";
    const location = String(user.user_metadata?.location ?? "").trim();

    const { data: existing } = await admin
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: businessError } = await admin.from("business_profiles").insert({
        user_id: user.id,
        business_name: businessName,
        location,
      });

      if (businessError) {
        throw new Error(businessError.message);
      }
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role,
    full_name: fullName,
    phone,
  };
}

export async function getProfile(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, email, role, full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}
