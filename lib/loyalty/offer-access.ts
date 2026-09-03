import { isOfferBlocked, loadBlockedSalons, NO_BLOCKED_SALONS } from "@/lib/blacklist/store";
import { canSeeVipOffer, vipUnlockAt, type MemberLevel } from "@/lib/loyalty/levels";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { loadOfferById, type BrowseOffer } from "@/lib/offers/load-active-offers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadOfferAccess(offerId: string, customerId?: string | null) {
  const offer = await loadOfferById(offerId);
  const loyalty = customerId
    ? await loadCustomerLoyalty(createAdminClient(), customerId)
    : { points: 0, level: "Bronze" as MemberLevel };
  const blocked = customerId ? await loadBlockedSalons(customerId) : NO_BLOCKED_SALONS;

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
