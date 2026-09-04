import { canSeeVipOffer, type MemberLevel } from "@/lib/loyalty/levels";
import { readHairProfile, type HairProfile } from "@/lib/hair/criteria";
import { loadSalonAverages } from "@/lib/ratings/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { OFFER_STATUS_EXPIRED } from "@/lib/offers/availability";
import { partnerSalonLabel, regionLabel } from "@/lib/offers/anonymize";
import { isUrgentFlag } from "@/lib/offers/urgent-flag";
import { resolveBusinessImageUrl } from "@/lib/business/images";

export type BrowseSlot = {
  id: string;
  start_time: string;
  is_booked: boolean;
};

export type BrowseOffer = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  normal_price: number | string;
  discount_price: number | string;
  duration_minutes: number;
  city: string;
  region: string;
  partner_name: string;
  salon_user_id: string | null;
  business_id: string | null;
  salon_rating_average: number | null;
  salon_rating_count: number;
  is_urgent: boolean;
  vip_early_access: boolean;
  created_at: string | null;
  available_slots: number | null;
  image_url: string | null;
  hair: HairProfile;
  slots: BrowseSlot[];
};

type ProfileFields = {
  id?: string;
  user_id?: string;
  location: string;
};

type OfferQueryRow = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  normal_price: number | string;
  discount_price: number | string;
  duration_minutes: number;
  is_urgent?: boolean | null;
  vip_early_access?: boolean | null;
  created_at?: string | null;
  status?: string | null;
  available_slots?: number | null;
  image_url?: string | null;
  business_id?: string | null;
  wanted_hair_structure?: string | null;
  wanted_hair_length?: string | null;
  wanted_hair_chemical?: string | null;
  business_profiles: ProfileFields | ProfileFields[] | null;
  offer_slots: { id: string; start_time: string; is_booked: boolean }[] | null;
};

function asProfile(value: OfferQueryRow["business_profiles"]): ProfileFields | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const FULL_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, is_urgent, vip_early_access, status, available_slots, created_at, business_id, image_url, wanted_hair_structure, wanted_hair_length, wanted_hair_chemical, business_profiles(id, user_id, location), offer_slots(id, start_time, is_booked)";
const BASE_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, is_urgent, vip_early_access, status, available_slots, created_at, business_id, image_url, business_profiles(id, user_id, location), offer_slots(id, start_time, is_booked)";
const MIN_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, is_urgent, status, created_at, business_id, image_url, business_profiles(id, user_id, location), offer_slots(id, start_time, is_booked)";
const IMAGE_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, status, available_slots, created_at, business_id, image_url, business_profiles(id, user_id, location), offer_slots(id, start_time, is_booked)";
const IMAGE_MIN_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, status, created_at, business_id, image_url, business_profiles(id, user_id, location), offer_slots(id, start_time, is_booked)";
const LEGACY_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, status, created_at, business_id, business_profiles(id, user_id, location), offer_slots(id, start_time, is_booked)";

async function fetchOfferRows(
  ids?: string[],
  statuses?: string[],
): Promise<OfferQueryRow[]> {
  const admin = createAdminClient();
  const run = async (columns: string) => {
    let query = admin.from("offers").select(columns);
    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }
    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }
    return query.order("created_at", { ascending: false });
  };

  const full = await run(FULL_OFFER_SELECT);
  const mid = full.error ? await run(BASE_OFFER_SELECT) : full;
  const withUrgent = mid.error ? await run(MIN_OFFER_SELECT) : mid;
  const withSlots = withUrgent.error ? await run(IMAGE_OFFER_SELECT) : withUrgent;
  const withImage = withSlots.error ? await run(IMAGE_MIN_OFFER_SELECT) : withSlots;
  const result = withImage.error ? await run(LEGACY_OFFER_SELECT) : withImage;

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as unknown as OfferQueryRow[];
  return hydrateOfferImages(admin, await hydrateUrgentFlags(admin, rows));
}

async function hydrateUrgentFlags(admin: ReturnType<typeof createAdminClient>, rows: OfferQueryRow[]) {
  if (rows.length === 0 || rows.some((row) => "is_urgent" in row && row.is_urgent !== undefined)) {
    return rows;
  }

  const ids = rows.map((row) => row.id);
  const flagged = await admin.from("offers").select("id, is_urgent").in("id", ids);
  if (flagged.error || !flagged.data) {
    return rows;
  }

  const byId = new Map(
    flagged.data.map((row) => [String((row as { id: string }).id), isUrgentFlag((row as { is_urgent?: unknown }).is_urgent)]),
  );

  return rows.map((row) => ({
    ...row,
    is_urgent: byId.get(row.id) ?? isUrgentFlag(row.is_urgent),
  }));
}

async function hydrateOfferImages(admin: ReturnType<typeof createAdminClient>, rows: OfferQueryRow[]) {
  if (rows.length === 0) {
    return rows;
  }

  let withImages = rows;
  if (!rows.some((row) => "image_url" in row)) {
    const ids = rows.map((row) => row.id);
    const extra = await admin.from("offers").select("id, image_url").in("id", ids);
    if (!extra.error && extra.data) {
      const byId = new Map(
        extra.data.map((row) => [String((row as { id: string }).id), (row as { image_url?: string | null }).image_url ?? null]),
      );
      withImages = rows.map((row) => ({
        ...row,
        image_url: byId.get(row.id) ?? row.image_url ?? null,
      }));
    }
  }

  return withImages.map((row) => ({
    ...row,
    image_url: resolveBusinessImageUrl(row.image_url) ?? row.image_url ?? null,
  }));
}

async function toBrowseOffers(
  rows: OfferQueryRow[],
  options?: { upcomingSlotsOnly?: boolean; requireSlots?: boolean; hideFullyBooked?: boolean },
): Promise<BrowseOffer[]> {
  const upcomingSlotsOnly = options?.upcomingSlotsOnly ?? true;
  const requireSlots = options?.requireSlots ?? true;
  const hideFullyBooked = options?.hideFullyBooked ?? false;
  const now = Date.now();

  const mapped = rows
    .filter((row) => row.status !== OFFER_STATUS_EXPIRED && row.status !== "inactive")
    .map((row) => {
    const profile = asProfile(row.business_profiles);
    const slots = (row.offer_slots ?? [])
      .filter((slot) => (upcomingSlotsOnly ? new Date(slot.start_time).getTime() >= now : true))
      .filter((slot) => (hideFullyBooked ? !slot.is_booked : true))
      .sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )
      .map((slot) => ({
        id: slot.id,
        start_time: slot.start_time,
        is_booked: Boolean(slot.is_booked),
      }));

    const city = profile?.location?.trim() || "";
    const businessId = row.business_id || profile?.id || null;
    const stableId = businessId || profile?.user_id || row.id;
    const unbooked = slots.filter((slot) => !slot.is_booked).length;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      requirements: row.requirements,
      normal_price: row.normal_price,
      discount_price: row.discount_price,
      duration_minutes: row.duration_minutes,
      city: city || "Standort folgt",
      region: regionLabel(city),
      partner_name: partnerSalonLabel(stableId),
      salon_user_id: profile?.user_id ?? null,
      business_id: businessId,
      salon_rating_average: null as number | null,
      salon_rating_count: 0,
      is_urgent: isUrgentFlag(row.is_urgent),
      vip_early_access: Boolean(row.vip_early_access),
      created_at: row.created_at ? String(row.created_at) : null,
      available_slots: typeof row.available_slots === "number" ? row.available_slots : unbooked,
      image_url: resolveBusinessImageUrl(row.image_url ? String(row.image_url) : null),
      hair: readHairProfile(row),
      slots,
    };
  });

  const salonUserIds = [
    ...new Set(mapped.map((offer) => offer.salon_user_id).filter((id): id is string => Boolean(id))),
  ];
  const averages = await loadSalonAverages(salonUserIds);

  return mapped
    .map((offer) => {
      const stats = offer.salon_user_id ? averages.get(offer.salon_user_id) : undefined;
      return {
        ...offer,
        salon_rating_average: stats?.average ?? null,
        salon_rating_count: stats?.count ?? 0,
      };
    })
    .filter((offer) => (requireSlots ? offer.slots.length > 0 : true));
}

export function earliestUnbookedSlot(offer: BrowseOffer) {
  return offer.slots.find((slot) => !slot.is_booked) ?? offer.slots[0] ?? null;
}

export function filterOffersForMember(offers: BrowseOffer[], level: MemberLevel, now = Date.now()) {
  return offers.filter((offer) =>
    canSeeVipOffer({
      vipEarlyAccess: offer.vip_early_access,
      createdAt: offer.created_at,
      level,
      now,
    }),
  );
}

export async function loadActiveOffers(): Promise<BrowseOffer[]> {
  const rows = await fetchOfferRows(undefined, ["active"]);
  const mapped = await toBrowseOffers(rows, {
    upcomingSlotsOnly: true,
    requireSlots: true,
    hideFullyBooked: true,
  });
  return mapped.sort((a, b) => Number(isUrgentFlag(b.is_urgent)) - Number(isUrgentFlag(a.is_urgent)));
}

export async function loadOffersByIds(ids: string[]): Promise<BrowseOffer[]> {
  if (ids.length === 0) {
    return [];
  }

  const unique = [...new Set(ids)];
  const rows = (await fetchOfferRows(unique)).filter(
    (row) => row.status !== OFFER_STATUS_EXPIRED,
  );
  const mapped = await toBrowseOffers(rows, { upcomingSlotsOnly: false, requireSlots: false });
  const byId = new Map(mapped.map((offer) => [offer.id, offer]));
  return ids.map((id) => byId.get(id)).filter((offer): offer is BrowseOffer => Boolean(offer));
}

export async function loadOfferById(id: string) {
  const offers = await loadActiveOffers();
  return offers.find((offer) => offer.id === id) ?? null;
}

export async function loadOfferSlot(slotId: string, offerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("offer_slots")
    .select("id, offer_id, start_time, end_time, is_booked")
    .eq("id", slotId)
    .eq("offer_id", offerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  if (data.is_booked) {
    return data;
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id")
    .eq("slot_id", slotId)
    .maybeSingle();

  return booking ? { ...data, is_booked: true } : data;
}

export async function loadAvailableSlot(slotId: string, offerId: string) {
  const data = await loadOfferSlot(slotId, offerId);

  if (!data || data.is_booked) {
    return null;
  }

  if (new Date(data.start_time).getTime() < Date.now()) {
    return null;
  }

  return data;
}
