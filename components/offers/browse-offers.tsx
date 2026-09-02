import { CityFilter } from "@/components/offers/city-filter";
import { OfferCard } from "@/components/offers/offer-card";
import { citiesFromOffers, loadActiveOffers } from "@/lib/offers/load-active-offers";

export async function BrowseOffers({
  city,
  basePath,
}: {
  city?: string;
  basePath: string;
}) {
  const allOffers = await loadActiveOffers();
  const cities = citiesFromOffers(allOffers);
  const selectedCity = city?.trim();
  const offers = selectedCity
    ? allOffers.filter(
        (offer) =>
          offer.location.toLocaleLowerCase("de-CH") ===
          selectedCity.toLocaleLowerCase("de-CH"),
      )
    : allOffers;

  return (
    <>
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-gold-deep">
          Phase 2 · Customer Discovery
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
          Starke Deals. Freie Slots. In deiner Stadt.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Entdecke Angebote von Salons — reduzierte Preise für Trainingsslots und kurzfristige
          Kapazitäten.
        </p>
      </div>

      <div className="mt-10">
        <CityFilter cities={cities} selected={city} basePath={basePath} />
      </div>

      {offers.length === 0 ? (
        <div className="mt-10 rounded-[2rem] border border-dashed border-ink/15 bg-paper/70 px-6 py-14 text-center">
          <p className="font-serif text-2xl text-ink">Keine Angebote gefunden</p>
          <p className="mt-2 text-sm text-ink-soft">
            {city
              ? `In ${city} gibt es gerade keine aktiven Deals. Wähle eine andere Stadt.`
              : "Sobald Salons Angebote veröffentlichen, erscheinen sie hier."}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </>
  );
}
