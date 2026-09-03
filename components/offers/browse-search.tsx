"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OfferCard } from "@/components/offers/offer-card";
import { searchBrowseOffers } from "@/lib/offers/fuzzy-search";
import { type BrowseOffer } from "@/lib/offers/load-active-offers";

export function BrowseSearchBoard({
  offers,
  initialQuery,
  basePath,
  favoriteIds = [],
  showFavorite = false,
  matchIds = [],
}: {
  offers: BrowseOffer[];
  initialQuery: string;
  basePath: string;
  favoriteIds?: string[];
  showFavorite?: boolean;
  matchIds?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const searching = query.trim().length > 0;
  const ranked = useMemo(() => searchBrowseOffers(offers, query), [offers, query]);
  const urgent = searching ? [] : ranked.filter((offer) => offer.is_urgent);
  const rest = searching ? ranked : ranked.filter((offer) => !offer.is_urgent);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = query.trim();
      const params = new URLSearchParams(window.location.search);
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }
      params.delete("stadt");
      const search = params.toString();
      const href = search ? `${pathname}?${search}` : pathname;
      const current = `${window.location.pathname}${window.location.search}`;
      if (href !== current && pathname === basePath) {
        router.replace(href, { scroll: false });
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, pathname, router, basePath]);

  return (
    <>
      <div className="mt-10 max-w-2xl">
        <label className="block">
          <span className="ui-kicker">Suche</span>
          <span className="ui-input mt-3 flex items-center gap-3 rounded-full py-2.5">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-ink-soft"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.2-3.2" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Balayage, Zürich, Kurzhaarschnitt…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
              aria-label="Angebote durchsuchen"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="ui-btn-secondary px-3 py-1 text-[11px]"
              >
                Leeren
              </button>
            ) : null}
          </span>
        </label>
        <p className="mt-3 text-sm text-ink-soft">
          {searching
            ? ranked.length === 1
              ? "1 Treffer, sortiert nach Relevanz."
              : `${ranked.length} Treffer, sortiert nach Relevanz.`
            : "Tippfehler sind erlaubt — z. B. findet Balyage auch Balayage."}
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="ui-empty mt-10 py-14 text-center">
          <p className="font-serif text-2xl text-ink">Keine Angebote gefunden</p>
          <p className="mt-2 text-sm text-ink-soft">
            {searching
              ? `Keine Treffer für „${query.trim()}“. Versuche einen anderen Begriff.`
              : "Sobald Salons Angebote veröffentlichen, erscheinen sie hier."}
          </p>
        </div>
      ) : (
        <>
          {urgent.length > 0 ? (
            <section className="mt-10">
              <p className="ui-kicker">Urgent Match · Kapitel 5.2</p>
              <h2 className="mt-2 font-serif text-3xl text-ink">Last-Minute</h2>
              <p className="mt-2 max-w-xl text-sm text-ink-soft">
                Dringende Deals — angepinnt, damit freie Kapazitäten sofort sichtbar sind.
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {urgent.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    showFavorite={showFavorite}
                    favorited={favoriteIds.includes(offer.id)}
                    perfectMatch={matchIds.includes(offer.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {rest.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                showFavorite={showFavorite}
                favorited={favoriteIds.includes(offer.id)}
                perfectMatch={matchIds.includes(offer.id)}
              />
              ))}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
