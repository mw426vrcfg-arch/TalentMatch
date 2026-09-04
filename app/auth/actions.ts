"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type AuthState } from "@/lib/auth/auth-state";
import { ensureProfile, getProfile, profileFromUser } from "@/lib/auth/ensure-profile";
import { redirectPathForRole } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { restoreCustomerIfEligible } from "@/lib/strikes/expire";
import { getStrikeRestriction, isAuthBanError } from "@/lib/strikes/restriction";
import { isReferralUserId } from "@/lib/referrals/store";
import {
  readLine,
  readSecret,
  sanitizeEmail,
  sanitizePhone,
  TEXT_LIMITS,
} from "@/lib/security/sanitize";

function safeInternalPath(path: string) {
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return "";
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = readLine(formData, "email", TEXT_LIMITS.email).toLowerCase();
  // Passwörter werden nie bereinigt – jedes Zeichen muss exakt erhalten bleiben.
  const password = readSecret(formData, "password");
  const next = safeInternalPath(readLine(formData, "next", 512));

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const supabase = await createClient();
  let { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error && isAuthBanError(error.message)) {
    try {
      const admin = tryCreateAdminClient();
      const { data: bannedUser } = admin
        ? await admin.from("users").select("id").eq("email", email).maybeSingle()
        : { data: null };

      if (bannedUser?.id) {
        const restored = await restoreCustomerIfEligible(String(bannedUser.id));
        if (restored.length > 0) {
          const retry = await supabase.auth.signInWithPassword({ email, password });
          error = retry.error;
        }
      }
    } catch (restoreError) {
      console.warn(
        "Sperr-Check nach Login fehlgeschlagen:",
        restoreError instanceof Error ? restoreError.message : restoreError,
      );
    }

    if (error) {
      return {
        error:
          "Dein Konto ist gesperrt. Du hast 3 aktive Strikes wegen No-Shows und kannst dich nicht mehr anmelden.",
      };
    }
  } else if (error) {
    return { error: "Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sitzung konnte nicht erstellt werden." };
  }

  let profile;
  try {
    profile = (await getProfile(user.id)) ?? (await ensureProfile(user));
  } catch (profileError) {
    console.warn(
      "Profil nach Login nicht verfügbar:",
      profileError instanceof Error ? profileError.message : profileError,
    );
    profile = profileFromUser(user);
  }

  if (profile.role === "customer") {
    try {
      const restriction = await getStrikeRestriction(user.id);
      if (restriction.banned) {
        await supabase.auth.signOut();
        return { error: restriction.message ?? "Dein Konto ist gesperrt." };
      }
    } catch (strikeError) {
      console.warn(
        "Strike-Check nach Login übersprungen:",
        strikeError instanceof Error ? strikeError.message : strikeError,
      );
    }
  }

  redirect(next || redirectPathForRole(profile.role));
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = readLine(formData, "full_name", TEXT_LIMITS.name);
  const email = sanitizeEmail(formData.get("email"));
  const phone = sanitizePhone(formData.get("phone"));
  const password = readSecret(formData, "password");
  const passwordConfirm = readSecret(formData, "password_confirm");
  const role = readLine(formData, "role", 20);
  const businessName = readLine(formData, "business_name", TEXT_LIMITS.name);
  const location = readLine(formData, "location", TEXT_LIMITS.location);
  const rawRef = readLine(formData, "ref", 64);
  const referredBy = isReferralUserId(rawRef) ? rawRef : "";

  if (!fullName || !password) {
    return { error: "Bitte Name, E-Mail und Passwort ausfüllen." };
  }

  if (!email) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  if (role !== "customer" && role !== "business") {
    return { error: "Bitte wählen, ob du dich als Kunde oder Salon registrierst." };
  }

  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
  }

  if (password !== passwordConfirm) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  if (role === "business" && (!businessName || !location)) {
    return { error: "Salonname und Standort sind für die Salon-Registrierung Pflicht." };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    headerList.get("origin") ||
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        role,
        phone,
        business_name: businessName,
        location,
        referred_by: role === "business" && referredBy ? referredBy : undefined,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Registrierung fehlgeschlagen. Bitte erneut versuchen." };
  }

  try {
    await ensureProfile(data.user);
  } catch (profileError) {
    const message =
      profileError instanceof Error
        ? profileError.message
        : "Profil konnte nicht gespeichert werden.";
    return { error: message };
  }

  if (!data.session) {
    return {
      success:
        "Konto erstellt. Bitte bestätige die E-Mail, danach kannst du dich anmelden.",
    };
  }

  redirect(redirectPathForRole(role));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
