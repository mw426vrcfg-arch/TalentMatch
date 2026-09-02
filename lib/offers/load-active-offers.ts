import { resolveLogoUrl } from "@/lib/business/images";
import { createAdminClient } from "@/lib/supabase/admin";

export type BrowseSlot = {
  id: string;
  start_time: string;
};

export type BrowseOffer = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  normal_price: number | string;
  discount_price: number | string;
  duration_minutes: number;
  location: string;
  salon_name: string;
  salon_address: string | null;
  salon_phone: string | null;
  salon_logo: string | null;
  slots: BrowseSlot[];
};

type ProfileFields = {
  business_name: string;
  location: string;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
};

type OfferQueryRow = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  normal_price: number | string;
  discount_price: number | string;
  duration_minutes: number;
  business_profiles: ProfileFields | ProfileFields[] | null;
  offer_slots: { id: string; start_time: string; is_booked: boolean }[] | null;
};

function asProfile(value: OfferQueryRow["business_profiles"]): ProfileFields | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const FULL_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, created_at, business_profiles(business_name, location, address, phone, logo_url), offer_slots(id, start_time, is_booked)";
const BASE_OFFER_SELECT =
  "id, title, description, requirements, normal_price, discount_price, duration_minutes, created_at, business_profiles(business_name, location), offer_slots(id, start_time, is_booked)";

export async function loadActiveOffers(city?: string): Promise<BrowseOffer[]> {
  const admin = createAdminClient();
  const full = await admin
    .from("offers")
    .select(FULL_OFFER_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const fallback = full.error
    ? await admin
        .from("offers")
        .select(BASE_OFFER_SELECT)
        .eq("status", "active")
        .order("created_at", { ascending: false })
    : null;

  const result = full.error ? fallback : full;
  const data = (result?.data ?? null) as OfferQueryRow[] | null;

  if (!result || result.error) {
    throw new Error(result?.error?.message ?? "Angebote konnten nicht geladen werden.");
  }

  const now = Date.now();
  const selectedCity = city?.trim().toLocaleLowerCase("de-CH");

  return ((data ?? []) as OfferQueryRow[])
    .map((row) => {
      const profile = asProfile(row.business_profiles);
      const slots = (row.offer_slots ?? [])
        .filter((slot) => !slot.is_booked && new Date(slot.start_time).getTime() >= now)
        .sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        )
        .map((slot) => ({ id: slot.id, start_time: slot.start_time }));

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        requirements: row.requirements,
        normal_price: row.normal_price,
        discount_price: row.discount_price,
        duration_minutes: row.duration_minutes,
        location: profile?.location?.trim() || "Standort folgt",
        salon_name: profile?.business_name?.trim() || "Salon",
        salon_address: profile?.address?.trim() || null,
        salon_phone: profile?.phone?.trim() || null,
        salon_logo: resolveLogoUrl(profile?.logo_url),
        slots,
      };
    })
    .filter((offer) => {
      if (!selectedCity) return true;
      return offer.location.toLocaleLowerCase("de-CH") === selectedCity;
    });
}

export function citiesFromOffers(offers: BrowseOffer[]) {
  return [...new Set(offers.map((offer) => offer.location))]
    .filter((city) => city && city !== "Standort folgt")
    .sort((a, b) => a.localeCompare(b, "de-CH"));
}

export async function loadOfferById(id: string) {
  const offers = await loadActiveOffers();
  return offers.find((offer) => offer.id === id) ?? null;
}

export async function loadAvailableSlot(slotId: string, offerId: string) {
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

  if (!data || data.is_booked) {
    return null;
  }

  if (new Date(data.start_time).getTime() < Date.now()) {
    return null;
  }

  return data;
}
