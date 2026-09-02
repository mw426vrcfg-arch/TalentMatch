import { NextResponse } from "next/server";
import { ensureProfile, getProfile } from "@/lib/auth/ensure-profile";
import { redirectPathForRole } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

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

  const profile = (await getProfile(user.id)) ?? (await ensureProfile(user));
  return NextResponse.redirect(
    `${origin}${next || redirectPathForRole(profile.role)}`,
  );
}
