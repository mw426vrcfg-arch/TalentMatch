import { createAdminClient } from "@/lib/supabase/admin";
import { expireDueStrikes, markCustomerBanned } from "@/lib/strikes/expire";

export type StrikeRestriction = {
  count: number;
  banned: boolean;
  tempBlockedUntil: Date | null;
  message: string | null;
};

const PERMANENT_BAN_HOURS = "876000h";

export function strikeLoginMessage(restriction: StrikeRestriction) {
  return restriction.message;
}

export function strikeLoginErrorParam(restriction: StrikeRestriction) {
  if (restriction.banned) {
    return "strikes";
  }
  return null;
}

export async function getStrikeRestriction(customerId: string): Promise<StrikeRestriction> {
  const empty: StrikeRestriction = {
    count: 0,
    banned: false,
    tempBlockedUntil: null,
    message: null,
  };

  try {
    await expireDueStrikes(customerId);
  } catch (error) {
    console.warn(
      "Strike-Verjährung fehlgeschlagen:",
      error instanceof Error ? error.message : error,
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.warn(
      "Strike-Check übersprungen:",
      error instanceof Error ? error.message : error,
    );
    return empty;
  }

  const { data, error } = await admin
    .from("strikes")
    .select("id, created_at")
    .eq("customer_id", customerId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Strike-Check fehlgeschlagen:", error.message);
    return empty;
  }

  const strikes = data ?? [];
  const count = strikes.length;

  if (count >= 3) {
    return {
      count,
      banned: true,
      tempBlockedUntil: null,
      message:
        "Dein Konto ist gesperrt. Du hast 3 aktive Strikes wegen No-Shows und kannst dich nicht mehr anmelden.",
    };
  }

  return { count, banned: false, tempBlockedUntil: null, message: null };
}

export async function banCustomerLogin(customerId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(customerId, {
    ban_duration: PERMANENT_BAN_HOURS,
  });

  if (error) {
    console.error("Auth-Ban fehlgeschlagen:", error.message);
  }

  await markCustomerBanned(customerId);
}

export function isAuthBanError(message: string) {
  const value = message.toLowerCase();
  return value.includes("ban") || value.includes("blocked");
}
