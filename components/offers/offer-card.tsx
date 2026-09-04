import Link from "next/link";
import { formatChf } from "@/lib/offers/format";
import { UrgentCountdown } from "@/components/offers/urgent-countdown";
import { earliestUnbookedSlot, type BrowseOffer } from "@/lib/offers/load-active-offers";
import { StarAverage } from "@/components/ratings/star-average";
import { SlotChoices } from "@/components/offers/slot-choices";
import { FavoriteHeart } from "@/components/offers/favorite-heart";
import { T } from "@/components/i18n/t";
import { LocalizedText } from "@/components/i18n/localized-text";
import { CoverImage } from "@/components/ui/cover-image";

export function UrgentBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`ui-urgent-badge inline-flex items-center gap-1.5 rounded-full border border-zinc-900/15 bg-zinc-900 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(29,29,31,0.22)] ${className}`.trim()}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <T k="browse.urgentBadge" />
    </span>
  );
}

function PartnerMark({ offer }: { offer: BrowseOffer }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/70 font-serif text-lg text-zinc-600 backdrop-blur-md">
        #
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{offer.partner_name}</p>
        <StarAverage
          average={offer.salon_rating_average}
          count={offer.salon_rating_count}
          className="mt-0.5"
          hideEmpty
        />
        <p className="ui-kicker mt-1 truncate">
          <LocalizedText text={offer.region} />
        </p>
      </div>
    </div>
  );
}

export function OfferCard({
  offer,
  favorited = false,
  showFavorite = false,
  perfectMatch = false,
}: {
  offer: BrowseOffer;
  favorited?: boolean;
  showFavorite?: boolean;
  perfectMatch?: boolean;
}) {
  const liveSlot = offer.is_urgent ? earliestUnbookedSlot(offer) : null;
  const cover = offer.image_url;

  return (
    <article
      className={`${offer.is_urgent ? "ui-card-urgent" : "ui-card-hover"} flex h-full flex-col overflow-hidden p-5 sm:p-6`}
    >
      {cover ? (
        <div className="relative -mx-5 -mt-5 mb-5 overflow-hidden sm:-mx-6 sm:-mt-6">
          <CoverImage src={cover} className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
          {offer.is_urgent ? (
            <div className="absolute top-3 left-3 z-10">
              <UrgentBadge />
            </div>
          ) : null}
          {showFavorite ? (
            <div className="absolute top-3 right-3 z-10">
              <FavoriteHeart offerId={offer.id} initialSaved={favorited} />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {offer.is_urgent ? (
            <div className="mb-3">
              <UrgentBadge />
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <Link href={`/offers/${offer.id}`} className="min-w-0 flex-1">
              <PartnerMark offer={offer} />
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {liveSlot ? <UrgentCountdown iso={liveSlot.start_time} /> : null}
              {showFavorite ? <FavoriteHeart offerId={offer.id} initialSaved={favorited} /> : null}
            </div>
          </div>
        </>
      )}
      {cover ? (
        <div className="flex items-start justify-between gap-3">
          <Link href={`/offers/${offer.id}`} className="min-w-0 flex-1">
            <PartnerMark offer={offer} />
          </Link>
          {liveSlot ? <UrgentCountdown iso={liveSlot.start_time} /> : null}
        </div>
      ) : null}
      {perfectMatch ? (
        <p className="mt-4 inline-flex self-start rounded-full border border-white/30 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-wide text-ink shadow-sm backdrop-blur-md">
          <T k="browse.perfectMatch" />
        </p>
      ) : null}
      <Link href={`/offers/${offer.id}`} className="block">
        <h2 className="mt-5 font-serif text-2xl leading-tight text-ink sm:text-3xl">{offer.title}</h2>
        {offer.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{offer.description}</p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <p className="ui-kicker">
              <T k="browse.discount" />
            </p>
            <p className="mt-1 font-serif text-3xl text-ink">{formatChf(offer.discount_price)}</p>
          </div>
          <div>
            <p className="ui-kicker">
              <T k="browse.original" />
            </p>
            <p className="mt-1 text-lg text-ink-soft line-through">
              {formatChf(offer.normal_price)}
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-6">
        <p className="ui-kicker">
          <T k="browse.slots" />
        </p>
        <SlotChoices offerId={offer.id} slots={offer.slots} compact />
      </div>
    </article>
  );
}
