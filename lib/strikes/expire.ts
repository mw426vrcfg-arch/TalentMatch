import { createAdminClient } from "@/lib/supabase/admin";
import { isAccountLockedStatus, notifyAccountReactivated } from "@/lib/strikes/reactivate";

export const STRIKE_VALIDITY_MONTHS = 6;
export const ACCOUNT_STATUS_ACTIVE = "aktiv";
export const ACCOUNT_STATUS_BANNED = "gesperrt";

type Admin = ReturnType<typeof createAdminClient>;

export type StrikeExpiryResult = {
  expired_strike_ids: string[];
  expired_customer_ids: string[];
  restored_user_ids: string[];
  previously_three: string[];
};

export function addUtcMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      monthIndex,
      Math.min(day, lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function strikeExpiresAt(createdAt: string | Date) {
  return addUtcMonths(new Date(createdAt), STRIKE_VALIDITY_MONTHS);
}

export function isStrikeExpired(createdAt: string | Date, now = new Date()) {
  return now.getTime() >= strikeExpiresAt(createdAt).getTime();
}

function isMissingColumnError(message: string) {
  return /could not find the '|schema cache|does not exist/i.test(message);
}

async function deactivateStrikes(admin: Admin, ids: string[], expiredAt: string) {
  if (ids.length === 0) {
    return;
  }

  const withStamp = await admin
    .from("strikes")
    .update({ active: false, expired_at: expiredAt })
    .in("id", ids);

  if (!withStamp.error) {
    return;
  }

  if (!isMissingColumnError(withStamp.error.message)) {
    throw new Error(withStamp.error.message);
  }

  const fallback = await admin.from("strikes").update({ active: false }).in("id", ids);
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }
}

async function setAccountStatus(admin: Admin, userId: string, status: string) {
  const attempts: Record<string, unknown>[] = [
    { account_status: status },
    { status },
  ];

  for (const payload of attempts) {
    const byId = await admin.from("users").update(payload).eq("id", userId);
    if (!byId.error) {
      return;
    }
    if (!isMissingColumnError(byId.error.message)) {
      throw new Error(byId.error.message);
    }
  }
}

export async function unbanCustomerLogin(customerId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(customerId, {
    ban_duration: "none",
  });

  if (error && !/not found|unable to find/i.test(error.message)) {
    console.error("Auth-Unban fehlgeschlagen:", error.message);
  }

  try {
    await setAccountStatus(admin, customerId, ACCOUNT_STATUS_ACTIVE);
  } catch (statusError) {
    console.error(
      "Account-Status konnte nicht auf aktiv gesetzt werden:",
      statusError instanceof Error ? statusError.message : statusError,
    );
  }
}

export async function markCustomerBanned(customerId: string) {
  const admin = createAdminClient();
  try {
    await setAccountStatus(admin, customerId, ACCOUNT_STATUS_BANNED);
  } catch (statusError) {
    console.error(
      "Account-Status konnte nicht auf gesperrt gesetzt werden:",
      statusError instanceof Error ? statusError.message : statusError,
    );
  }
}

async function restoreIfBelowLimit(admin: Admin, customerIds: string[], unlockNotifyIds: string[] = []) {
  const restored: string[] = [];
  const unique = [...new Set(customerIds.filter(Boolean))];
  const notifyUnlock = new Set(unlockNotifyIds);

  for (const customerId of unique) {
    const { data, error } = await admin
      .from("strikes")
      .select("id")
      .eq("customer_id", customerId)
      .eq("active", true);

    if (error) {
      throw new Error(error.message);
    }

    if ((data ?? []).length >= 3) {
      continue;
    }

    const { data: user } = await admin
      .from("users")
      .select("account_status")
      .eq("id", customerId)
      .maybeSingle();
    const wasLocked = isAccountLockedStatus(
      user?.account_status != null ? String(user.account_status) : null,
    );

    await unbanCustomerLogin(customerId);
    restored.push(customerId);
    if (wasLocked || notifyUnlock.has(customerId)) {
      await notifyAccountReactivated(admin, customerId);
    }
  }

  return restored;
}

async function loadActiveStrikes(admin: Admin, customerId?: string) {
  let query = admin.from("strikes").select("id, customer_id, created_at").eq("active", true);
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function expireDueStrikes(customerId?: string): Promise<StrikeExpiryResult> {
  const admin = createAdminClient();
  const now = new Date();
  const rows = await loadActiveStrikes(admin, customerId);
  const countsBefore = new Map<string, number>();
  for (const row of rows) {
    const id = String(row.customer_id);
    countsBefore.set(id, (countsBefore.get(id) ?? 0) + 1);
  }
  const expired = rows.filter((row) => isStrikeExpired(String(row.created_at), now));
  const expiredIds = expired.map((row) => String(row.id));
  const expiredCustomerIds = [...new Set(expired.map((row) => String(row.customer_id)))];
  const previouslyThree = expiredCustomerIds.filter((id) => (countsBefore.get(id) ?? 0) >= 3);

  await deactivateStrikes(admin, expiredIds, now.toISOString());

  return {
    expired_strike_ids: expiredIds,
    expired_customer_ids: expiredCustomerIds,
    restored_user_ids: [],
    previously_three: previouslyThree,
  };
}

async function loadBannedAccountIds(admin: Admin) {
  const { data, error } = await admin
    .from("users")
    .select("id")
    .in("account_status", ["gesperrt", "banned", "restricted"]);

  if (error) {
    if (isMissingColumnError(error.message)) {
      return [] as string[];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => String(row.id));
}

export async function restoreCustomerIfEligible(customerId: string) {
  const expired = await expireDueStrikes(customerId);
  const admin = createAdminClient();
  return restoreIfBelowLimit(admin, [customerId], expired.previously_three);
}

export async function runStrikeExpiryJob() {
  const admin = createAdminClient();
  const expired = await expireDueStrikes();
  const bannedIds = await loadBannedAccountIds(admin);
  const restored = await restoreIfBelowLimit(
    admin,
    [...expired.expired_customer_ids, ...bannedIds],
    expired.previously_three,
  );

  return {
    expired_strike_ids: expired.expired_strike_ids,
    expired_customer_ids: expired.expired_customer_ids,
    restored_user_ids: restored,
  };
}
