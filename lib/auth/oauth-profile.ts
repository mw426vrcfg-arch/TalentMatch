import { type User } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { displayNameFromUser, type OAuthRole } from "@/lib/auth/oauth-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function applyOAuthRole(
  user: User,
  input: {
    role: OAuthRole;
    fullName?: string;
    businessName?: string;
    location?: string;
  },
) {
  const admin = createAdminClient();
  const fullName = (input.fullName ?? "").trim() || displayNameFromUser(user);

  const metadata: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
    role: input.role,
    full_name: fullName,
  };

  if (input.role === "business") {
    metadata.business_name = (input.businessName ?? "").trim() || fullName || "Mein Salon";
    metadata.location = (input.location ?? "").trim();
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ensureProfile({ ...user, user_metadata: metadata } as User);
}
