import { createAdminClient } from "@/lib/supabase/admin";
import {
  POINTS_PER_COMPLETED_VISIT,
  memberLevelFromPoints,
  type MemberLevel,
} from "@/lib/loyalty/levels";

type Admin = ReturnType<typeof createAdminClient>;

type LoyaltyState = { points: number; level: MemberLevel };

function isMissingSchema(message: string) {
  return /could not find the '|schema cache|does not exist|relation .* does not exist/i.test(message);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function readPoints(row: Record<string, unknown> | null | undefined) {
  if (!row) {
    return 0;
  }
  const raw = row.beauty_points ?? row.points;
  return Math.max(0, Number(raw ?? 0) || 0);
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

async function loadProfileRow(admin: Admin, customerId: string) {
  const selects = ["id, user_id, beauty_points, member_level, points", "id, user_id, beauty_points, member_level", "id, user_id, points"];

  for (const columns of selects) {
    const byUser = await admin.from("customer_profiles").select(columns).eq("user_id", customerId).maybeSingle();
    if (!byUser.error && byUser.data) {
      return asRecord(byUser.data);
    }
    if (byUser.error && !isMissingSchema(byUser.error.message)) {
      break;
    }
  }

  const byId = await admin
    .from("customer_profiles")
    .select("id, user_id, beauty_points, member_level")
    .eq("id", customerId)
    .maybeSingle();

  return asRecord(byId.data);
}

async function countCompletedVisits(admin: Admin, customerIds: string[]) {
  if (customerIds.length === 0) {
    return 0;
  }

  const { data: applications, error } = await admin.from("applications").select("id").in("customer_id", customerIds);
  if (error || !applications?.length) {
    return 0;
  }

  const applicationIds = applications.map((row) => row.id as string);
  const counted = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("application_id", applicationIds)
    .eq("booking_status", "completed");

  return counted.count ?? 0;
}

async function updateRow(
  admin: Admin,
  table: string,
  payload: Record<string, unknown>,
  column: "user_id" | "id",
  customerId: string,
) {
  const { data, error } = await admin.from(table).update(payload).eq(column, customerId).select("id").maybeSingle();
  if (error) {
    return { ok: false, missing: isMissingSchema(error.message) };
  }
  return { ok: Boolean(data), missing: false };
}

async function persistLoyalty(admin: Admin, ids: string[], points: number, level: MemberLevel) {
  const payloads: Record<string, unknown>[] = [
    { beauty_points: points, member_level: level },
    { beauty_points: points, member_level: level, points },
    { points, member_level: level },
    { beauty_points: points },
    { points },
  ];

  for (const table of ["customer_profiles", "profiles"]) {
    for (const payload of payloads) {
      for (const id of ids) {
        const byUser = await updateRow(admin, table, payload, "user_id", id);
        if (byUser.ok) {
          return true;
        }
        const byId = await updateRow(admin, table, payload, "id", id);
        if (byId.ok) {
          return true;
        }
        if (byUser.missing && byId.missing && table === "profiles") {
          return false;
        }
      }
    }
  }

  console.error("Beauty points update failed: no matching profile row", ids.join(","));
  return false;
}

export async function loadCustomerLoyalty(admin: Admin, customerId: string): Promise<LoyaltyState> {
  const row = await loadProfileRow(admin, customerId);
  const ids = uniqueIds([customerId, row?.user_id as string | undefined, row?.id as string | undefined]);
  const stored = readPoints(row);
  const earned = (await countCompletedVisits(admin, ids)) * POINTS_PER_COMPLETED_VISIT;
  const points = Math.max(stored, earned);
  const level = memberLevelFromPoints(points);

  if (points > stored) {
    await persistLoyalty(admin, ids, points, level);
  }

  return { points, level };
}

export async function awardCompletedVisitPoints(admin: Admin, customerId: string) {
  const row = await loadProfileRow(admin, customerId);
  const ids = uniqueIds([customerId, row?.user_id as string | undefined, row?.id as string | undefined]);
  const stored = readPoints(row);
  const earned = (await countCompletedVisits(admin, ids)) * POINTS_PER_COMPLETED_VISIT;
  const points = Math.max(earned, stored + POINTS_PER_COMPLETED_VISIT);
  const level = memberLevelFromPoints(points);

  await persistLoyalty(admin, ids, points, level);
  return { points, level };
}
