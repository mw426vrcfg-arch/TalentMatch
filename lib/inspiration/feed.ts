import { filterBlockedOffers, loadBlockedSalons, NO_BLOCKED_SALONS } from "@/lib/blacklist/store";
import { partnerSalonLabel, regionLabel } from "@/lib/offers/anonymize";
import { loadActiveOffers, type BrowseOffer } from "@/lib/offers/load-active-offers";
import { createAdminClient } from "@/lib/supabase/admin";

export type InspirationTile = {
  id: string;
  before_url: string | null;
  after_url: string | null;
  region: string;
  partner_name: string;
  offer: BrowseOffer | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export async function loadInspirationFeed(customerId?: string | null): Promise<InspirationTile[]> {
  const admin = createAdminClient();
  const blocked = customerId ? await loadBlockedSalons(customerId) : NO_BLOCKED_SALONS;
  const offers = filterBlockedOffers(await loadActiveOffers(), blocked);
  const offerBySalon = new Map<string, BrowseOffer>();
  for (const offer of offers) {
    if (offer.salon_user_id && !offerBySalon.has(offer.salon_user_id)) {
      offerBySalon.set(offer.salon_user_id, offer);
    }
  }

  const tiles: InspirationTile[] = [];
  const seen = new Set<string>();

  function pushTile(tile: InspirationTile) {
    const key = tile.offer?.id || tile.after_url || tile.id;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    tiles.push(tile);
  }

  for (const offer of offers) {
    pushTile({
      id: `offer-${offer.id}`,
      before_url: null,
      after_url: offer.image_url,
      region: offer.region,
      partner_name: offer.partner_name,
      offer,
    });
  }

  const fromTable = await admin
    .from("portfolio_images")
    .select("id, salon_user_id, before_url, after_url, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (!fromTable.error) {
    for (const row of fromTable.data ?? []) {
      const record = asRecord(row);
      if (!record) {
        continue;
      }
      const salonUserId = String(record.salon_user_id ?? "");
      if (salonUserId && blocked.salonUserIds.has(salonUserId)) {
        continue;
      }
      const offer = offerBySalon.get(salonUserId) ?? null;
      const after = String(record.after_url ?? "");
      const before = String(record.before_url ?? "");
      if (!after && !before) {
        continue;
      }
      pushTile({
        id: `portfolio-${record.id}`,
        before_url: before || null,
        after_url: after || before || null,
        region: offer?.region || "Region folgt",
        partner_name: offer?.partner_name || partnerSalonLabel(salonUserId || String(record.id)),
        offer,
      });
    }
  }

  const fromRatings = await admin
    .from("ratings")
    .select("id, from_user_id, before_url, after_url, created_at")
    .not("after_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(80);

  if (!fromRatings.error) {
    for (const row of fromRatings.data ?? []) {
      const record = asRecord(row);
      if (!record) {
        continue;
      }
      const salonUserId = String(record.from_user_id ?? "");
      if (salonUserId && blocked.salonUserIds.has(salonUserId)) {
        continue;
      }
      const offer = offerBySalon.get(salonUserId) ?? null;
      const after = String(record.after_url ?? "");
      const before = String(record.before_url ?? "");
      if (!after) {
        continue;
      }
      pushTile({
        id: `rating-${record.id}`,
        before_url: before || null,
        after_url: after,
        region: offer?.region || regionLabel(null),
        partner_name: offer?.partner_name || partnerSalonLabel(salonUserId || String(record.id)),
        offer,
      });
    }
  }

  return tiles;
}
