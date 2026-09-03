import { createAdminClient } from "@/lib/supabase/admin";

export const URGENT_MATCH_MONTHLY_LIMIT = 3;
export const URGENT_MATCH_REFERRAL_LIMIT = 4;

type Admin = ReturnType<typeof createAdminClient>;

function zurichYearMonth(date: Date) {
  const stamp = date.toLocaleString("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = stamp.split("-").map(Number);
  return { year, month };
}

export function zurichMonthKey(date = new Date()) {
  const { year, month } = zurichYearMonth(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function resolveSalonUserId(admin: Admin, businessId: string) {
  const byId = await admin
    .from("business_profiles")
    .select("user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (byId.data?.user_id) {
    return String(byId.data.user_id);
  }
  const byUser = await admin
    .from("business_profiles")
    .select("user_id")
    .eq("user_id", businessId)
    .maybeSingle();
  return byUser.data?.user_id ? String(byUser.data.user_id) : businessId;
}

async function urgentLimitForSalon(admin: Admin, businessId: string) {
  const salonUserId = await resolveSalonUserId(admin, businessId);
  const { data, error } = await admin
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", salonUserId)
    .eq("reward_month", zurichMonthKey())
    .limit(1);

  if (error) {
    if (!/referrals|does not exist|schema cache/i.test(error.message)) {
      console.error("Referral bonus lookup failed:", error.message);
    }
    return URGENT_MATCH_MONTHLY_LIMIT;
  }

  return (data ?? []).length > 0 ? URGENT_MATCH_REFERRAL_LIMIT : URGENT_MATCH_MONTHLY_LIMIT;
}

export async function countUrgentOffersThisMonth(admin: Admin, businessId: string) {
  const { year, month } = zurichYearMonth(new Date());
  const query = await admin
    .from("offers")
    .select("id, created_at, is_urgent")
    .eq("business_id", businessId)
    .eq("is_urgent", true);

  if (query.error) {
    if (/is_urgent|schema cache|does not exist/i.test(query.error.message)) {
      return 0;
    }
    throw new Error(query.error.message);
  }

  return (query.data ?? []).filter((row) => {
    const created = new Date(String(row.created_at));
    if (Number.isNaN(created.getTime())) {
      return false;
    }
    const stamp = zurichYearMonth(created);
    return stamp.year === year && stamp.month === month;
  }).length;
}

export async function loadUrgentMatchQuota(admin: Admin, businessId: string) {
  const [used, limit] = await Promise.all([
    countUrgentOffersThisMonth(admin, businessId),
    urgentLimitForSalon(admin, businessId),
  ]);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    reached: used >= limit,
  };
}
