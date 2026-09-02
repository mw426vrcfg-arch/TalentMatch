export type UserRole = "customer" | "business" | "admin";

export function getSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local");
  }

  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt in .env.local");
  }

  return key;
}

export function redirectPathForRole(role: UserRole | string | null | undefined) {
  if (role === "business") {
    return "/business/dashboard";
  }

  return "/dashboard";
}
