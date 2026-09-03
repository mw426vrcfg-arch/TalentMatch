import { createAdminClient } from "@/lib/supabase/admin";
import {
  POINTS_PER_COMPLETED_VISIT,
  memberLevelFromPoints,
  normalizeMemberLevel,
  type MemberLevel,
} from "@/lib/loyalty/levels";

type Admin = ReturnType<typeof createAdminClient>;

function isMissingColumn(message: string) {
  return /could not find the '|schema cache|does not exist/i.test(message);
}

export async function loadCustomerLoyalty(
  admin: Admin,
  customerId: string,
): Promise<{ points: number; level: MemberLevel }> {
  const { data, error } = await admin
    .from("customer_profiles")
    .select("beauty_points, member_level")
    .eq("user_id", customerId)
    .maybeSingle();

  if (error && isMissingColumn(error.message)) {
    return { points: 0, level: "Bronze" };
  }

  const row =
    data ??
    (await admin.from("customer_profiles").select("beauty_points, member_level").eq("id", customerId).maybeSingle())
      .data;
  const points = Math.max(0, Number(row?.beauty_points ?? 0) || 0);
  return {
    points,
    level: normalizeMemberLevel(row?.member_level != null ? String(row.member_level) : memberLevelFromPoints(points)),
  };
}

export async function awardCompletedVisitPoints(admin: Admin, customerId: string) {
  const current = await loadCustomerLoyalty(admin, customerId);
  const points = current.points + POINTS_PER_COMPLETED_VISIT;
  const level = memberLevelFromPoints(points);
  const payload = { beauty_points: points, member_level: level };

  let { error } = await admin
    .from("customer_profiles")
    .update(payload)
    .eq("user_id", customerId);
  if (error && /user_id/i.test(error.message)) {
    const retry = await admin.from("customer_profiles").update(payload).eq("id", customerId);
    error = retry.error;
  }

  if (error && isMissingColumn(error.message)) {
    return current;
  }
  if (error) {
    console.error("Beauty points update failed:", error.message);
    return current;
  }

  return { points, level };
}
