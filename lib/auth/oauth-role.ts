import { type User } from "@supabase/supabase-js";

export const OAUTH_ROLE_COOKIE = "tm_oauth_role";

export type OAuthRole = "customer" | "business";

export function isOAuthRole(value: string | null | undefined): value is OAuthRole {
  return value === "customer" || value === "business";
}

export function displayNameFromUser(user: User) {
  const metadata = user.user_metadata ?? {};
  const candidates = [metadata.full_name, metadata.name, metadata.preferred_username];

  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value) {
      return value;
    }
  }

  const email = String(user.email ?? "").trim();
  return email ? email.split("@")[0] : "";
}
