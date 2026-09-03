import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureProfile, getProfile } from "@/lib/auth/ensure-profile";
import { applyOAuthRole } from "@/lib/auth/oauth-profile";
import { OAUTH_ROLE_COOKIE } from "@/lib/auth/oauth-role";
import { redirectPathForRole } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const existing = await getProfile(user.id);

  if (existing) {
    return NextResponse.redirect(
      `${origin}${next || redirectPathForRole(existing.role)}`,
    );
  }

  // E-Mail-Registrierung: die Rolle steckt bereits in den Metadaten.
  if (String(user.user_metadata?.role ?? "").trim()) {
    const profile = await ensureProfile(user);
    return NextResponse.redirect(
      `${origin}${next || redirectPathForRole(profile.role)}`,
    );
  }

  const cookieStore = await cookies();
  const pendingRole = cookieStore.get(OAUTH_ROLE_COOKIE)?.value;

  // Kunde hat die Rolle vor dem OAuth-Redirect gewaehlt: direkt anlegen.
  if (pendingRole === "customer") {
    await applyOAuthRole(user, { role: "customer" });
    const response = NextResponse.redirect(`${origin}${next || "/dashboard"}`);
    response.cookies.delete(OAUTH_ROLE_COOKIE);
    return response;
  }

  // Salon oder unbekannte Rolle: Auswahl-Popup nachgelagert.
  return NextResponse.redirect(`${origin}/auth/role`);
}
