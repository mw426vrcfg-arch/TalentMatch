import Link from "next/link";

type CityFilterProps = {
  cities: string[];
  selected?: string;
  basePath: string;
};

export function CityFilter({ cities, selected, basePath }: CityFilterProps) {
  const current = selected?.trim() ?? "";

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-gold-deep">Stadt</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={basePath}
          className={`rounded-full px-4 py-2 text-sm transition ${
            !current
              ? "bg-ink text-cream"
              : "border border-ink/10 bg-paper text-ink hover:border-gold"
          }`}
        >
          Alle Städte
        </Link>
        {cities.map((city) => {
          const active = current.toLocaleLowerCase("de-CH") === city.toLocaleLowerCase("de-CH");
          return (
            <Link
              key={city}
              href={`${basePath}?stadt=${encodeURIComponent(city)}`}
              className={`rounded-full px-4 py-2 text-sm transition ${
                active
                  ? "bg-ink text-cream"
                  : "border border-ink/10 bg-paper text-ink hover:border-gold"
              }`}
            >
              {city}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
