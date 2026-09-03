import { EditOfferButton } from "@/components/business/edit-offer-button";
import { formatChf, formatSlotTime, groupSlotsByDay } from "@/lib/offers/format";
import { offerStatusLabel } from "@/lib/offers/availability";
import { isOwnSalonOffer } from "@/lib/offers/ownership";
import { type SalonOfferListItem } from "@/lib/offers/salon-list";

export function SalonOfferCard({
  offer,
  currentUserId,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
}: {
  offer: SalonOfferListItem;
  currentUserId: string;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
}) {
  const canEdit = isOwnSalonOffer(offer, currentUserId) && offer.salon_id === currentUserId;

  return (
    <article className="ui-card overflow-hidden p-5">
      {offer.image_url ? (
        <img
          src={offer.image_url}
          alt=""
          className="-mx-5 -mt-5 mb-5 aspect-[16/9] w-[calc(100%+2.5rem)] object-cover"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-2xl text-ink">{offer.title}</h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {offer.is_urgent ? (
            <span className="ui-badge bg-zinc-900 text-white">Last-Minute</span>
          ) : null}
          <span className="ui-badge">{offerStatusLabel(offer.status)}</span>
          {canEdit ? (
            <EditOfferButton
              offer={offer}
              currentUserId={currentUserId}
              urgentLimitReached={urgentLimitReached}
              urgentLimit={urgentLimit}
              urgentUsed={urgentUsed}
            />
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{offer.description}</p>
      <p className="mt-4 text-sm text-ink">
        <span className="text-ink-soft line-through">{formatChf(offer.normal_price)}</span>{" "}
        <span className="font-medium">{formatChf(offer.discount_price)}</span>
        <span className="text-ink-soft"> · {offer.duration_minutes} Min.</span>
        {typeof offer.available_slots === "number" ? (
          <span className="text-ink-soft"> · {offer.available_slots} frei</span>
        ) : null}
      </p>
      <div className="mt-3 space-y-3">
        {groupSlotsByDay(offer.offer_slots ?? []).map((group) => (
          <div key={group.key}>
            <p className="ui-kicker">{group.label}</p>
            <ul className="mt-1 space-y-1 text-sm text-ink-soft">
              {group.slots.map((slot) => (
                <li key={slot.id}>
                  {formatSlotTime(slot.start_time)}
                  {slot.is_booked ? " · ausgebucht" : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}
