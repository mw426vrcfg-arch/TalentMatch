import { SalonOfferCard } from "@/components/business/salon-offer-card";
import { type SalonOfferListItem } from "@/lib/offers/salon-list";

export function SalonOfferList({
  offers,
  currentUserId,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
  empty,
}: {
  offers: SalonOfferListItem[];
  currentUserId: string;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
  empty: string;
}) {
  if (offers.length === 0) {
    return <div className="ui-empty">{empty}</div>;
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <SalonOfferCard
          key={offer.id}
          offer={offer}
          currentUserId={currentUserId}
          urgentLimitReached={urgentLimitReached}
          urgentLimit={urgentLimit}
          urgentUsed={urgentUsed}
        />
      ))}
    </div>
  );
}
