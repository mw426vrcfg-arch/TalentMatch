import { BrowseSearchBoard } from "@/components/offers/browse-search";
import { T } from "@/components/i18n/t";
import { loadFavoriteOfferIds } from "@/lib/favorites/store";
import { isPerfectHairMatch } from "@/lib/hair/criteria";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { filterBlockedOffers, loadBlockedSalons, NO_BLOCKED_SALONS } from "@/lib/blacklist/store";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { filterOffersForMember, type BrowseOffer } from "@/lib/offers/load-active-offers";
import { loadActiveOffersCached } from "@/lib/offers/public-cache";
import { scheduleOfferExpiry } from "@/lib/offers/expire";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

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
  let allOffers: BrowseOffer[] = [];
  try {
    allOffers = await loadActiveOffersCached();
  } catch (error) {
    console.error("Active offers load failed:", error instanceof Error ? error.message : error);
  }
  const admin = userId ? tryCreateAdminClient() : null;
  const loyalty =
    userId && admin
      ? await loadCustomerLoyalty(admin, userId)
      : { points: 0, level: "Bronze" as const };
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
      const loaded = admin
        ? await loadCustomerProfile(admin, userId)
        : { profile: null };
      if (loaded.profile?.hair) {
        matchIds = offers.filter((offer) => isPerfectHairMatch(loaded.profile!.hair, offer.hair)).map((offer) => offer.id);
      }
    } catch {
      matchIds = [];
    }
  }

  return (
    <div suppressHydrationWarning>
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
        signedIn={Boolean(userId)}
      />
    </div>
  );
}
