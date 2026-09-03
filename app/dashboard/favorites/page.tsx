import { CustomerShell } from "@/components/customer/customer-shell";
import { FollowSalonButton } from "@/components/offers/follow-salon-button";
import { OfferCard } from "@/components/offers/offer-card";
import { requireCustomer } from "@/lib/auth/require-customer";
import { filterBlockedOffers, loadBlockedSalons } from "@/lib/blacklist/store";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { filterOffersForMember } from "@/lib/offers/load-active-offers";
import { loadFavoriteOffers, loadFollowedSalonCards } from "@/lib/favorites/store";
import { createAdminClient } from "@/lib/supabase/admin";

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
    <CustomerShell title="Favoriten" userName={profile.full_name} signedIn>
      <div className="mb-10 max-w-2xl">
        <p className="ui-kicker">Gespeichert</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Favoriten</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Alle gelikten Angebote und abonnierten Salons — live aus deinem Konto.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="font-serif text-3xl text-ink">Gelikte Angebote</h2>
        {liked.length === 0 ? (
          <div className="ui-empty mt-4">Noch keine Favoriten. Tippe auf das Herz bei einem Deal.</div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {liked.map((offer) => (
              <OfferCard key={offer.id} offer={offer} showFavorite favorited />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-3xl text-ink">Abonnierte Salons</h2>
        {followed.length === 0 ? (
          <div className="ui-empty mt-4">
            Auf einem Angebot «Salon abonnieren» tippen. Neue Deals erscheinen in deinen Mitteilungen.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {followed.map((salon) => (
              <article key={salon.salon_id} className="ui-card flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-serif text-2xl text-ink">{salon.partner_name}</p>
                  <p className="mt-1 text-sm text-ink-soft">{salon.region}</p>
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
