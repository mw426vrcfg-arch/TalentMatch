import { loyaltyProgress as computeLoyaltyProgress, type LoyaltyProgress } from "@/lib/loyalty/progress";

export const POINTS_PER_COMPLETED_VISIT = 100;
export const SILVER_POINTS = 500;
export const GOLD_POINTS = 1500;
export const PLATINUM_POINTS = 3000;
export const VIP_EARLY_ACCESS_MS = 30 * 60 * 1000;

export type MemberLevel = "Bronze" | "Silber" | "Gold" | "Platin";

export type { LoyaltyProgress };

export function memberLevelFromPoints(points: number): MemberLevel {
  if (points >= PLATINUM_POINTS) {
    return "Platin";
  }
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
  if (raw === "platin" || raw === "platinum" || raw === "platine") {
    return "Platin";
  }
  if (raw === "gold" || raw === "or") {
    return "Gold";
  }
  if (raw === "silber" || raw === "silver" || raw === "argent") {
    return "Silber";
  }
  return "Bronze";
}

export function loyaltyProgress(points: number): LoyaltyProgress {
  return computeLoyaltyProgress(points);
}

export function hasEarlyAccess(level: MemberLevel) {
  return level === "Silber" || level === "Gold" || level === "Platin";
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
