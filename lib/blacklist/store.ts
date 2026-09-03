import { type BrowseOffer } from "@/lib/offers/load-active-offers";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type BlockedSalons = {
  businessIds: Set<string>;
  salonUserIds: Set<string>;
};

export const NO_BLOCKED_SALONS: BlockedSalons = {
  businessIds: new Set<string>(),
  salonUserIds: new Set<string>(),
};

function isMissingTable(message: string) {
  return /salon_blacklists/i.test(message) && /does not exist|schema cache|relation/i.test(message);
}

export async function isCustomerBlocked(admin: Admin, salonId: string, customerId: string) {
  const { data, error } = await admin
    .from("salon_blacklists")
    .select("id")
    .eq("salon_id", salonId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) {
      return false;
    }
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function setCustomerBlocked(
  admin: Admin,
  salonId: string,
  customerId: string,
  blocked: boolean,
) {
  if (!blocked) {
    const { error } = await admin
      .from("salon_blacklists")
      .delete()
      .eq("salon_id", salonId)
      .eq("customer_id", customerId);

    if (error && !isMissingTable(error.message)) {
      throw new Error(error.message);
    }
    return false;
  }

  const { error } = await admin
    .from("salon_blacklists")
    .insert({ salon_id: salonId, customer_id: customerId });

  if (error && error.code !== "23505") {
    throw new Error(
      isMissingTable(error.message)
        ? "Sperrliste ist noch nicht aktiviert. Bitte salon_blacklists.sql in Supabase ausführen."
        : error.message,
    );
  }

  return true;
}

export async function loadBlockedSalons(customerId: string): Promise<BlockedSalons> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("salon_blacklists")
    .select("salon_id")
    .eq("customer_id", customerId);

  if (error) {
    if (!isMissingTable(error.message)) {
      console.error("Blacklist load failed:", error.message);
    }
    return NO_BLOCKED_SALONS;
  }

  const businessIds = new Set((data ?? []).map((row) => String(row.salon_id)));
  if (businessIds.size === 0) {
    return NO_BLOCKED_SALONS;
  }

  const { data: profiles } = await admin
    .from("business_profiles")
    .select("id, user_id")
    .in("id", [...businessIds]);

  const salonUserIds = new Set<string>();
  for (const row of profiles ?? []) {
    if (row.user_id) {
      salonUserIds.add(String(row.user_id));
    }
  }

  return { businessIds, salonUserIds };
}

export function isOfferBlocked(offer: BrowseOffer, blocked: BlockedSalons) {
  if (offer.business_id && blocked.businessIds.has(offer.business_id)) {
    return true;
  }
  return Boolean(offer.salon_user_id && blocked.salonUserIds.has(offer.salon_user_id));
}

export function filterBlockedOffers<T extends BrowseOffer>(offers: T[], blocked: BlockedSalons) {
  if (blocked.businessIds.size === 0) {
    return offers;
  }
  return offers.filter((offer) => !isOfferBlocked(offer, blocked));
}
