"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureProfile, getProfile } from "@/lib/auth/ensure-profile";
import { redirectPathForRole } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getStrikeRestriction, isAuthBanError } from "@/lib/strikes/restriction";

export type AuthState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

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
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const next = safeInternalPath(readString(formData, "next"));

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isAuthBanError(error.message)) {
      return {
        error:
          "Dein Konto ist gesperrt. Du hast 3 aktive Strikes wegen No-Shows und kannst dich nicht mehr anmelden.",
      };
    }
    return { error: "Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sitzung konnte nicht erstellt werden." };
  }

  const profile = (await getProfile(user.id)) ?? (await ensureProfile(user));

  if (profile.role === "customer") {
    const restriction = await getStrikeRestriction(user.id);
    if (restriction.banned) {
      await supabase.auth.signOut();
      return { error: restriction.message ?? "Dein Konto ist gesperrt." };
    }
  }

  redirect(next || redirectPathForRole(profile.role));
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = readString(formData, "full_name");
  const email = readString(formData, "email");
  const phone = readString(formData, "phone");
  const password = readString(formData, "password");
  const role = readString(formData, "role");
  const businessName = readString(formData, "business_name");
  const location = readString(formData, "location");

  if (!fullName || !email || !password) {
    return { error: "Bitte Name, E-Mail und Passwort ausfüllen." };
  }

  if (role !== "customer" && role !== "business") {
    return { error: "Bitte wählen, ob du dich als Kunde oder Salon registrierst." };
  }

  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
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
