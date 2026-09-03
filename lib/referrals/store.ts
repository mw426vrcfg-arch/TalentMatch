import { createAdminClient } from "@/lib/supabase/admin";
import { zurichMonthKey } from "@/lib/offers/urgent-quota";

type Admin = ReturnType<typeof createAdminClient>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isReferralUserId(value: string | null | undefined) {
  return Boolean(value && UUID.test(value.trim()));
}

export function salonInvitePath(userId: string) {
  return `/register?role=business&ref=${encodeURIComponent(userId)}`;
}

function isMissingTable(message: string) {
  return /referrals|does not exist|schema cache/i.test(message);
}

export async function recordSalonReferral(
  admin: Admin,
  input: { referrerUserId: string; referredUserId: string },
) {
  if (!isReferralUserId(input.referrerUserId) || !isReferralUserId(input.referredUserId)) {
    return { saved: false };
  }
  if (input.referrerUserId === input.referredUserId) {
    return { saved: false };
  }

  const { data: referrer, error: referrerError } = await admin
    .from("users")
    .select("id, role")
    .eq("id", input.referrerUserId)
    .maybeSingle();

  if (referrerError || !referrer) {
    return { saved: false };
  }
  if (referrer.role !== "business" && referrer.role !== "admin") {
    return { saved: false };
  }

  const { error } = await admin.from("referrals").insert({
    referrer_user_id: input.referrerUserId,
    referred_user_id: input.referredUserId,
    reward_month: zurichMonthKey(),
  });

  if (!error) {
    return { saved: true };
  }
  if (/duplicate|unique/i.test(error.message) || isMissingTable(error.message)) {
    return { saved: false };
  }
  console.error("Referral insert failed:", error.message);
  return { saved: false };
}

export async function countReferralsInMonth(admin: Admin, referrerUserId: string, month = zurichMonthKey()) {
  const { data, error } = await admin
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", referrerUserId)
    .eq("reward_month", month);

  if (error) {
    if (!isMissingTable(error.message)) {
      console.error("Referral load failed:", error.message);
    }
    return 0;
  }
  return (data ?? []).length;
}
