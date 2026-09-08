import { OfferCard } from "@/components/offers/offer-card";
import { type BrowseOffer } from "@/lib/offers/load-active-offers";

export function OfferGrid({
  offers,
  favoriteIds = [],
  showFavorite = false,
  matchIds = [],
  signedIn = false,
  className = "mt-10 grid gap-6 md:grid-cols-2",
}: {
  offers: BrowseOffer[];
  favoriteIds?: string[];
  showFavorite?: boolean;
  matchIds?: string[];
  signedIn?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          showFavorite={showFavorite}
          signedIn={signedIn}
          favorited={favoriteIds.includes(offer.id)}
          perfectMatch={matchIds.includes(offer.id)}
        />
      ))}
    </div>
  );
}
