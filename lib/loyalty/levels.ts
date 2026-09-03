export const POINTS_PER_COMPLETED_VISIT = 100;
export const SILVER_POINTS = 500;
export const GOLD_POINTS = 1500;
export const VIP_EARLY_ACCESS_MS = 30 * 60 * 1000;

export type MemberLevel = "Bronze" | "Silber" | "Gold";

export function memberLevelFromPoints(points: number): MemberLevel {
  if (points >= GOLD_POINTS) {
    return "Gold";
  }
  if (points >= SILVER_POINTS) {
    return "Silber";
  }
  return "Bronze";
}

export function normalizeMemberLevel(value: string | null | undefined): MemberLevel {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "gold") {
    return "Gold";
  }
  if (raw === "silber" || raw === "silver") {
    return "Silber";
  }
  return "Bronze";
}

export function hasEarlyAccess(level: MemberLevel) {
  return level === "Silber" || level === "Gold";
}

export function vipUnlockAt(createdAt: string | null | undefined) {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isNaN(created)) {
    return 0;
  }
  return created + VIP_EARLY_ACCESS_MS;
}

export function canSeeVipOffer(input: {
  vipEarlyAccess: boolean;
  createdAt: string | null | undefined;
  level: MemberLevel;
  now?: number;
}) {
  if (!input.vipEarlyAccess) {
    return true;
  }
  if (hasEarlyAccess(input.level)) {
    return true;
  }
  return (input.now ?? Date.now()) >= vipUnlockAt(input.createdAt);
}
