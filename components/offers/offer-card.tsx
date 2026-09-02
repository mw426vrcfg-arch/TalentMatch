import Link from "next/link";
import { formatChf, formatSlot } from "@/lib/offers/format";
import { type BrowseOffer } from "@/lib/offers/load-active-offers";

function SalonMark({ offer }: { offer: BrowseOffer }) {
  const initial = offer.salon_name.slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {offer.salon_logo ? (
        <img
          src={offer.salon_logo}
          alt=""
          className="h-12 w-12 rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 font-serif text-lg text-gold-deep">
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{offer.salon_name}</p>
        <p className="truncate text-xs uppercase tracking-[0.18em] text-gold-deep">
          {offer.location}
        </p>
      </div>
    </div>
  );
}

export function OfferCard({ offer }: { offer: BrowseOffer }) {
  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-ink/10 bg-paper p-6 shadow-[0_16px_50px_rgba(28,23,20,0.05)]">
      <Link href={`/offers/${offer.id}`} className="block">
        <SalonMark offer={offer} />
        <h2 className="mt-5 font-serif text-3xl leading-tight text-ink">{offer.title}</h2>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gold-deep">Discount Price</p>
            <p className="mt-1 font-serif text-3xl text-ink">{formatChf(offer.discount_price)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Original Price</p>
            <p className="mt-1 text-lg text-ink-soft line-through">
              {formatChf(offer.normal_price)}
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Verfügbare Slots</p>
        {offer.slots.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Aktuell keine freien Termine</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {offer.slots.map((slot) => (
              <li key={slot.id}>
                <Link
                  href={`/offers/${offer.id}/apply?slot=${slot.id}`}
                  className="inline-block rounded-full border border-ink/10 bg-cream px-3 py-1.5 text-xs text-ink transition hover:border-gold hover:bg-gold/10"
                >
                  {formatSlot(slot.start_time)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
