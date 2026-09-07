/** Supabase SSR legt die Session in Cookies der Form `sb-<ref>-auth-token` ab. */
export function isSupabaseAuthCookieName(name: string) {
  return name.startsWith("sb-") && name.includes("auth-token") && !name.includes("code-verifier");
}

export function hasSupabaseAuthCookie(cookies: Array<{ name: string }>) {
  return cookies.some((cookie) => isSupabaseAuthCookieName(cookie.name));
}
