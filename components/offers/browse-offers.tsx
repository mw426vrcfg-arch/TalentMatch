import { BrowseSearchBoard } from "@/components/offers/browse-search";
import { T } from "@/components/i18n/t";
import { loadFavoriteOfferIds } from "@/lib/favorites/store";
import { isPerfectHairMatch } from "@/lib/hair/criteria";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { filterBlockedOffers, loadBlockedSalons, NO_BLOCKED_SALONS } from "@/lib/blacklist/store";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { filterOffersForMember, loadActiveOffers } from "@/lib/offers/load-active-offers";
import { scheduleOfferExpiry } from "@/lib/offers/expire";
import { createAdminClient } from "@/lib/supabase/admin";

export async function BrowseOffers({
  query,
  basePath,
  userId,
}: {
  query?: string;
  basePath: string;
  userId?: string | null;
}) {
  scheduleOfferExpiry();
  const admin = createAdminClient();
  const allOffers = await loadActiveOffers();
  const loyalty = userId ? await loadCustomerLoyalty(admin, userId) : { points: 0, level: "Bronze" as const };
  const blocked = userId ? await loadBlockedSalons(userId) : NO_BLOCKED_SALONS;
  const offers = filterBlockedOffers(filterOffersForMember(allOffers, loyalty.level), blocked);
  let favoriteIds: string[] = [];
  let matchIds: string[] = [];
  if (userId) {
    try {
      favoriteIds = await loadFavoriteOfferIds(userId);
    } catch (error) {
      console.error("Favorites load failed:", error);
    }
    try {
      const loaded = await loadCustomerProfile(admin, userId);
      if (loaded.profile?.hair) {
        matchIds = offers.filter((offer) => isPerfectHairMatch(loaded.profile!.hair, offer.hair)).map((offer) => offer.id);
      }
    } catch {
      matchIds = [];
    }
  }

  return (
    <>
      <div className="max-w-2xl">
        <p className="ui-kicker">
          <T k="browse.discover" />
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
          <T k="browse.title" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          <T k="browse.searchIntro" />
        </p>
      </div>

      <BrowseSearchBoard
        offers={offers}
        initialQuery={query ?? ""}
        basePath={basePath}
        favoriteIds={favoriteIds}
        showFavorite={Boolean(userId)}
        matchIds={matchIds}
      />
    </>
  );
}
