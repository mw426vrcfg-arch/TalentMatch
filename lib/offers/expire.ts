import { createAdminClient } from "@/lib/supabase/admin";
import {
  OFFER_STATUS_ACTIVE,
  OFFER_STATUS_EXPIRED,
  OFFER_STATUS_FULL,
  OFFER_STATUS_FULLY_BOOKED,
} from "@/lib/offers/availability";

type Admin = ReturnType<typeof createAdminClient>;

// Solange die Migration offers_expiry.sql nicht gelaufen ist, kennt das Enum
// 'expired' noch nicht. Dann reicht 'inactive', um den Feed sauber zu halten.
const FALLBACK_STATUS = "inactive";

const CLEANUP_STATUSES = [OFFER_STATUS_ACTIVE, OFFER_STATUS_FULL, OFFER_STATUS_FULLY_BOOKED];

const PAGE_SIZE = 500;

type SlotRow = { start_time: string; is_booked: boolean | null };

type OfferRow = {
  id: string;
  status: string | null;
  offer_slots: SlotRow[] | null;
};

export type OfferExpiryResult = {
  checked: number;
  expired_offer_ids: string[];
  status_used: string;
};

/**
 * Abgelaufen ist ein Angebot, dessen Termine alle in der Vergangenheit liegen
 * und bei dem mindestens ein Slot nie gebucht wurde. Angebote ohne Slots bleiben
 * unberührt, damit frisch angelegte Deals nicht sofort verschwinden.
 */
export function isOfferExpired(slots: SlotRow[], now: number) {
  if (slots.length === 0) {
    return false;
  }

  const allInPast = slots.every((slot) => new Date(slot.start_time).getTime() < now);
  const hasUnbookedSlot = slots.some((slot) => !slot.is_booked);

  return allInPast && hasUnbookedSlot;
}

/**
 * Je nach Migrationsstand kennt das offer_status-Enum nicht alle Werte aus
 * CLEANUP_STATUSES. Postgres lehnt die Abfrage dann komplett ab, also nehmen wir
 * den beanstandeten Wert aus dem Filter und versuchen es erneut.
 */
async function selectCandidatePage(admin: Admin, statuses: string[], from: number) {
  let active = [...statuses];

  for (let attempt = 0; attempt < statuses.length; attempt += 1) {
    const { data, error } = await admin
      .from("offers")
      .select("id, status, offer_slots(start_time, is_booked)")
      .in("status", active)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (!error) {
      return { rows: (data ?? []) as unknown as OfferRow[], statuses: active };
    }

    const unknown = error.message.match(/invalid input value for enum \w+: "([^"]+)"/i)?.[1];
    if (!unknown || !active.includes(unknown)) {
      throw new Error(error.message);
    }

    active = active.filter((status) => status !== unknown);
    if (active.length === 0) {
      throw new Error(error.message);
    }
  }

  throw new Error("Angebots-Status konnte nicht gelesen werden.");
}

async function loadCleanupCandidates(admin: Admin) {
  const rows: OfferRow[] = [];
  let statuses = CLEANUP_STATUSES;

  for (let page = 0; ; page += 1) {
    const result = await selectCandidatePage(admin, statuses, page * PAGE_SIZE);
    statuses = result.statuses;
    rows.push(...result.rows);

    if (result.rows.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function markExpired(admin: Admin, ids: string[]) {
  let status = OFFER_STATUS_EXPIRED;

  for (let start = 0; start < ids.length; start += PAGE_SIZE) {
    const chunk = ids.slice(start, start + PAGE_SIZE);
    const { error } = await admin.from("offers").update({ status }).in("id", chunk);

    if (!error) {
      continue;
    }

    if (status === OFFER_STATUS_EXPIRED && /invalid input value|offer_status/i.test(error.message)) {
      console.warn(
        "offer_status kennt 'expired' noch nicht — bitte offers_expiry.sql ausführen. Fallback: inactive.",
      );
      status = FALLBACK_STATUS;
      const retry = await admin.from("offers").update({ status }).in("id", chunk);
      if (retry.error) {
        throw new Error(retry.error.message);
      }
      continue;
    }

    throw new Error(error.message);
  }

  return status;
}

export async function runOfferExpiryJob(
  options: { now?: number; dryRun?: boolean } = {},
): Promise<OfferExpiryResult> {
  const now = options.now ?? Date.now();
  const admin = createAdminClient();
  const candidates = await loadCleanupCandidates(admin);
  const expiredIds = candidates
    .filter((offer) => isOfferExpired(offer.offer_slots ?? [], now))
    .map((offer) => offer.id);

  if (options.dryRun) {
    return {
      checked: candidates.length,
      expired_offer_ids: expiredIds,
      status_used: OFFER_STATUS_EXPIRED,
    };
  }

  const statusUsed =
    expiredIds.length > 0 ? await markExpired(admin, expiredIds) : OFFER_STATUS_EXPIRED;

  return {
    checked: candidates.length,
    expired_offer_ids: expiredIds,
    status_used: statusUsed,
  };
}
