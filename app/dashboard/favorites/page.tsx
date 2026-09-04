import { CustomerShell } from "@/components/customer/customer-shell";
import { FollowSalonButton } from "@/components/offers/follow-salon-button";
import { OfferCard } from "@/components/offers/offer-card";
import { requireCustomer } from "@/lib/auth/require-customer";
import { filterBlockedOffers, loadBlockedSalons } from "@/lib/blacklist/store";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { filterOffersForMember } from "@/lib/offers/load-active-offers";
import { loadFavoriteOffers, loadFollowedSalonCards } from "@/lib/favorites/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageIntro, T } from "@/components/i18n/t";
import { LocalizedText } from "@/components/i18n/localized-text";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { user, profile } = await requireCustomer();
  let liked: Awaited<ReturnType<typeof loadFavoriteOffers>> = [];
  let followed: Awaited<ReturnType<typeof loadFollowedSalonCards>> = [];
  try {
    [liked, followed] = await Promise.all([
      loadFavoriteOffers(user.id),
      loadFollowedSalonCards(user.id),
    ]);
    const loyalty = await loadCustomerLoyalty(createAdminClient(), user.id);
    const blocked = await loadBlockedSalons(user.id);
    liked = filterBlockedOffers(filterOffersForMember(liked, loyalty.level), blocked);
  } catch (error) {
    console.error("Favorites tab load failed:", error);
  }

  return (
    <CustomerShell titleKey="nav.favorites" userName={profile.full_name} signedIn>
      <PageIntro kicker="favorites.kicker" title="favorites.title" description="favorites.intro" />

      <section className="mb-12">
        <h2 className="font-serif text-3xl text-ink">
          <T k="favorites.likedOffers" />
        </h2>
        {liked.length === 0 ? (
          <div className="ui-empty mt-4">
            <T k="favorites.empty" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {liked.map((offer) => (
              <OfferCard key={offer.id} offer={offer} showFavorite favorited />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-3xl text-ink">
          <T k="favorites.followedSalons" />
        </h2>
        {followed.length === 0 ? (
          <div className="ui-empty mt-4">
            <T k="favorites.emptyFollowed" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {followed.map((salon) => (
              <article key={salon.salon_id} className="ui-card flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-serif text-2xl text-ink">{salon.partner_name}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    <LocalizedText text={salon.region} />
                  </p>
                </div>
                <FollowSalonButton salonId={salon.salon_id} initialFollowing />
              </article>
            ))}
          </div>
        )}
      </section>
    </CustomerShell>
  );
}
