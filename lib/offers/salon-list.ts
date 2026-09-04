import { readHairProfile, type HairProfile } from "@/lib/hair/criteria";
import { resolveBusinessImageUrl } from "@/lib/business/images";
import { isUrgentFlag } from "@/lib/offers/urgent-flag";
import { createAdminClient } from "@/lib/supabase/admin";

export type SalonOfferSlot = {
  id: string;
  start_time: string;
  is_booked: boolean;
};

export type SalonOfferListItem = {
  id: string;
  business_id: string;
  /** Besitzer-ID des Angebots (offers.business_id). Alias für die Edit-Sperre. */
  salon_id: string;
  title: string;
  description: string | null;
  normal_price: number | string;
  discount_price: number | string;
  duration_minutes: number;
  status: string;
  available_slots: number | null;
  is_urgent: boolean;
  vip_early_access: boolean;
  image_url: string | null;
  hair: HairProfile;
  offer_slots: SalonOfferSlot[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function mapSalonOffer(row: unknown): SalonOfferListItem | null {
  const record = asRecord(row);
  if (!record || typeof record.id !== "string") {
    return null;
  }

  const slots = Array.isArray(record.offer_slots)
    ? record.offer_slots
        .map((slot) => {
          const item = asRecord(slot);
          if (!item || typeof item.id !== "string" || typeof item.start_time !== "string") {
            return null;
          }
          return {
            id: item.id,
            start_time: item.start_time,
            is_booked: Boolean(item.is_booked),
          };
        })
        .filter((slot): slot is SalonOfferSlot => slot !== null)
    : [];

  return {
    id: record.id,
    business_id: String(record.business_id ?? ""),
    salon_id: String(record.salon_id ?? record.business_id ?? ""),
    title: String(record.title ?? ""),
    description: record.description == null ? null : String(record.description),
    normal_price: record.normal_price as number | string,
    discount_price: record.discount_price as number | string,
    duration_minutes: Number(record.duration_minutes) || 60,
    status: String(record.status ?? "active"),
    available_slots: typeof record.available_slots === "number" ? record.available_slots : null,
    is_urgent: isUrgentFlag(record.is_urgent),
    vip_early_access: Boolean(record.vip_early_access),
    image_url: resolveBusinessImageUrl(record.image_url ? String(record.image_url) : null),
    hair: readHairProfile(record),
    offer_slots: slots.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    ),
  };
}

export async function loadSalonOffers(businessId: string): Promise<SalonOfferListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("offers")
    .select("*, offer_slots(id, start_time, is_booked)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map(mapSalonOffer)
    .filter((offer): offer is SalonOfferListItem => offer !== null);
}
