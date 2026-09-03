import { parseSlotIdFromNotes } from "@/lib/applications/slot-from-notes";
import { signApplicationImages } from "@/lib/applications/image-urls";
import { resolveAvatarUrl } from "@/lib/customer/images";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { EMPTY_TREATMENT_PASS, type TreatmentPass } from "@/lib/customer/treatment-pass";
import { type HairProfile } from "@/lib/hair/criteria";
import {
  isSalonIdentityRevealed,
  partnerSalonLabel,
  regionLabel,
} from "@/lib/offers/anonymize";
import { loadRatingAverages } from "@/lib/ratings/store";
import { createAdminClient } from "@/lib/supabase/admin";

export type SalonApplication = {
  id: string;
  notes: string | null;
  status: string;
  uploaded_images: string[];
  created_at: string;
  slot_id: string | null;
  offer_id: string;
  offer_title: string;
  slot_start: string | null;
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    avatar_url: string | null;
    active_strikes: number;
    rating_average: number | null;
    rating_count: number;
    hair: HairProfile;
    treatment_pass: TreatmentPass;
  };
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const APPLICATION_COLUMNS =
  "id, notes, status, uploaded_images, created_at, offer_id, customer_id";

export async function loadSalonPendingApplications(businessId: string) {
  const admin = createAdminClient();
  const { data: offers, error: offerError } = await admin
    .from("offers")
    .select("id, title")
    .eq("business_id", businessId);

  if (offerError) {
    throw new Error(offerError.message);
  }

  const offerRows = offers ?? [];
  if (offerRows.length === 0) {
    return [] as SalonApplication[];
  }

  const offerTitle = new Map(offerRows.map((offer) => [offer.id as string, offer.title as string]));
  const offerIds = offerRows.map((offer) => offer.id as string);

  const { data: applications, error } = await admin
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .in("offer_id", offerIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = applications ?? [];
  if (rows.length === 0) {
    return [] as SalonApplication[];
  }

  const customerIds = [...new Set(rows.map((row) => row.customer_id as string))];
  const slotIds = [
    ...new Set(rows.map((row) => parseSlotIdFromNotes(row.notes as string | null)).filter(Boolean)),
  ] as string[];

  const [{ data: users }, { data: slots }, { data: strikes }, averages] = await Promise.all([
    admin.from("users").select("id, full_name, email, phone").in("id", customerIds),
    slotIds.length > 0
      ? admin.from("offer_slots").select("id, start_time").in("id", slotIds)
      : Promise.resolve({ data: [] as { id: string; start_time: string }[] }),
    admin.from("strikes").select("customer_id").eq("active", true).in("customer_id", customerIds),
    loadRatingAverages(customerIds),
  ]);

  const userMap = new Map((users ?? []).map((user) => [user.id as string, user]));
  const slotMap = new Map((slots ?? []).map((slot) => [slot.id as string, slot.start_time as string]));
  const strikeCounts = new Map<string, number>();

  for (const strike of strikes ?? []) {
    const id = String(strike.customer_id);
    strikeCounts.set(id, (strikeCounts.get(id) ?? 0) + 1);
  }

  return Promise.all(
    rows.map(async (row) => {
      const customerId = row.customer_id as string;
      const user = userMap.get(customerId);
      const slotId = parseSlotIdFromNotes(row.notes as string | null);

      const customerProfile = await loadCustomerProfile(admin, customerId);
      const rating = averages.get(customerId) ?? { average: null, count: 0 };

      return {
        id: row.id as string,
        notes: (row.notes as string | null) ?? null,
        status: row.status as string,
        uploaded_images: await signApplicationImages(
          (row.uploaded_images as string[] | null) ?? [],
        ),
        created_at: row.created_at as string,
        slot_id: slotId,
        offer_id: row.offer_id as string,
        offer_title: offerTitle.get(row.offer_id as string) ?? "Angebot",
        slot_start: slotId ? (slotMap.get(slotId) ?? null) : null,
        customer: {
          id: customerId,
          full_name:
            customerProfile.profile?.full_name ||
            (user?.full_name as string | undefined) ||
            "Kunde",
          email: (user?.email as string | undefined) || "",
          phone: (user?.phone as string | null | undefined) ?? null,
          bio: customerProfile.profile?.bio ?? null,
          avatar_url: resolveAvatarUrl(customerProfile.profile?.avatar_url),
          active_strikes: strikeCounts.get(customerId) ?? 0,
          rating_average: rating.average,
          rating_count: rating.count,
          hair: customerProfile.profile?.hair ?? { structure: null, length: null, chemical: null },
          treatment_pass: customerProfile.profile?.treatment_pass ?? EMPTY_TREATMENT_PASS,
        },
      };
    }),
  );
}

export type CustomerApplication = {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  offer_title: string;
  partner_name: string;
  region: string;
  identity_revealed: boolean;
  salon_name: string | null;
  salon_address: string | null;
  salon_phone: string | null;
  slot_start: string | null;
  booking_status: string | null;
};

export async function loadCustomerApplications(customerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("applications")
    .select("id, status, notes, created_at, offer_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return [] as CustomerApplication[];
  }

  const offerIds = [...new Set(rows.map((row) => row.offer_id as string))];
  const applicationIds = rows.map((row) => row.id as string);
  const slotIds = [
    ...new Set(rows.map((row) => parseSlotIdFromNotes(row.notes as string | null)).filter(Boolean)),
  ] as string[];

  const [{ data: offers }, { data: slots }, { data: bookings }] = await Promise.all([
    admin
      .from("offers")
      .select("id, title, business_profiles(id, business_name, location, address, phone)")
      .in("id", offerIds),
    slotIds.length > 0
      ? admin.from("offer_slots").select("id, start_time").in("id", slotIds)
      : Promise.resolve({ data: [] as { id: string; start_time: string }[] }),
    admin
      .from("bookings")
      .select("application_id, booking_status")
      .in("application_id", applicationIds),
  ]);

  const offerMap = new Map(
    (offers ?? []).map((offer) => {
      const profile = asOne(
        offer.business_profiles as
          | {
              id?: string;
              business_name?: string;
              location: string;
              address?: string | null;
              phone?: string | null;
            }
          | {
              id?: string;
              business_name?: string;
              location: string;
              address?: string | null;
              phone?: string | null;
            }[]
          | null,
      );
      const stableId = profile?.id || (offer.id as string);
      return [
        offer.id as string,
        {
          title: offer.title as string,
          partner_name: partnerSalonLabel(stableId),
          region: regionLabel(profile?.location),
          salon_name: profile?.business_name?.trim() || null,
          salon_address: profile?.address?.trim() || null,
          salon_phone: profile?.phone?.trim() || null,
        },
      ];
    }),
  );
  const slotMap = new Map((slots ?? []).map((slot) => [slot.id as string, slot.start_time as string]));
  const bookingMap = new Map(
    (bookings ?? []).map((booking) => [
      booking.application_id as string,
      booking.booking_status as string,
    ]),
  );

  return rows.map((row) => {
    const offer = offerMap.get(row.offer_id as string);
    const slotId = parseSlotIdFromNotes(row.notes as string | null);
    const bookingStatus = bookingMap.get(row.id as string) ?? null;
    const revealed = isSalonIdentityRevealed(row.status as string, bookingStatus);

    return {
      id: row.id as string,
      status: row.status as string,
      notes: (row.notes as string | null) ?? null,
      created_at: row.created_at as string,
      offer_title: offer?.title ?? "Angebot",
      partner_name: offer?.partner_name ?? partnerSalonLabel(row.offer_id as string),
      region: offer?.region ?? regionLabel(null),
      identity_revealed: revealed,
      salon_name: revealed ? offer?.salon_name ?? null : null,
      salon_address: revealed ? offer?.salon_address ?? null : null,
      salon_phone: revealed ? offer?.salon_phone ?? null : null,
      slot_start: slotId ? (slotMap.get(slotId) ?? null) : null,
      booking_status: bookingStatus,
    };
  });
}
