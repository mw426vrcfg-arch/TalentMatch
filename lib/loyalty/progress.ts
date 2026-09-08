export type LoyaltyProgress = {
  level: "Bronze" | "Silber" | "Gold" | "Platin";
  points: number;
  target: number;
  remaining: number;
  nextLevel: "Bronze" | "Silber" | "Gold" | "Platin" | null;
  ratio: number;
  maxed: boolean;
};

const SILVER_POINTS = 500;
const GOLD_POINTS = 1500;
const PLATINUM_POINTS = 3000;

function levelFromPoints(points: number): LoyaltyProgress["level"] {
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

export function loyaltyProgress(points: number): LoyaltyProgress {
  const safe = Math.max(0, Math.floor(Number(points) || 0));
  const level = levelFromPoints(safe);

  if (safe >= PLATINUM_POINTS) {
    return {
      level: "Platin",
      points: safe,
      target: PLATINUM_POINTS,
      remaining: 0,
      nextLevel: null,
      ratio: 1,
      maxed: true,
    };
  }

  const target = level === "Gold" ? PLATINUM_POINTS : level === "Silber" ? GOLD_POINTS : SILVER_POINTS;
  const nextLevel: LoyaltyProgress["nextLevel"] =
    level === "Gold" ? "Platin" : level === "Silber" ? "Gold" : "Silber";

  return {
    level,
    points: safe,
    target,
    remaining: Math.max(0, target - safe),
    nextLevel,
    ratio: target > 0 ? Math.min(1, safe / target) : 0,
    maxed: false,
  };
}
