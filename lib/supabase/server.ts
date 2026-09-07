import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function hasSupabaseSessionCookie() {
  const cookieStore = await cookies();
  return hasSupabaseAuthCookie(cookieStore.getAll());
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components dürfen Cookies nicht setzen; Middleware refresht die Session.
        }
      },
    },
  });
}
