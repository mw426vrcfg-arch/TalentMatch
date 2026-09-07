import { isOfferBlocked, loadBlockedSalons, NO_BLOCKED_SALONS } from "@/lib/blacklist/store";
import { canSeeVipOffer, vipUnlockAt, type MemberLevel } from "@/lib/loyalty/levels";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { loadOfferById, type BrowseOffer } from "@/lib/offers/load-active-offers";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export async function loadOfferAccess(offerId: string, customerId?: string | null) {
  const offer = await loadOfferById(offerId);
  let loyalty = { points: 0, level: "Bronze" as MemberLevel };
  if (customerId) {
    const admin = tryCreateAdminClient();
    if (admin) {
      loyalty = await loadCustomerLoyalty(admin, customerId);
    }
  }
  let blocked = NO_BLOCKED_SALONS;
  if (customerId) {
    try {
      blocked = await loadBlockedSalons(customerId);
    } catch (error) {
      console.error("Blacklist load failed:", error instanceof Error ? error.message : error);
    }
  }

  if (!offer || isOfferBlocked(offer, blocked)) {
    return { offer: null as BrowseOffer | null, visible: false, level: loyalty.level, unlockAt: 0 };
  }

  const visible = canSeeVipOffer({
    vipEarlyAccess: offer.vip_early_access,
    createdAt: offer.created_at,
    level: loyalty.level,
  });

  return {
    offer,
    visible,
    level: loyalty.level,
    unlockAt: vipUnlockAt(offer.created_at),
  };
}
