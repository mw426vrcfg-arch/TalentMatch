"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OfferCard } from "@/components/offers/offer-card";
import { UrgentFilterToggle } from "@/components/offers/urgent-filter";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { pinUrgentOffers, searchBrowseOffers } from "@/lib/offers/fuzzy-search";
import { isUrgentFlag } from "@/lib/offers/urgent-flag";
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
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const searching = query.trim().length > 0;
  const ranked = useMemo(() => {
    const found = searchBrowseOffers(offers, query, locale);
    const scoped = urgentOnly ? found.filter((offer) => isUrgentFlag(offer.is_urgent)) : found;
    return pinUrgentOffers(scoped);
  }, [offers, query, locale, urgentOnly]);
  const filtering = searching || urgentOnly;

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
          <span className="ui-kicker">{t("browse.search")}</span>
          <span className="ui-input mt-3 flex items-center gap-3 rounded-full py-2.5 backdrop-blur-xl">
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
              placeholder={t("browse.searchPlaceholder")}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
              aria-label={t("browse.searchAria")}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="ui-btn-secondary px-3 py-1 text-[11px]"
              >
                {t("common.clear")}
              </button>
            ) : null}
          </span>
        </label>
        <div className="mt-3">
          <UrgentFilterToggle on={urgentOnly} onChange={setUrgentOnly} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {filtering
            ? ranked.length === 1
              ? t("browse.hitsOne")
              : t("browse.hitsMany", { count: ranked.length })
            : t("browse.searchHint")}
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="ui-empty mt-10 py-14 text-center">
          <p className="font-serif text-2xl text-ink">
            {urgentOnly && !searching ? t("browse.urgentEmptyTitle") : t("browse.emptyTitle")}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {searching
              ? t("browse.emptyQueryHint", { query: query.trim() })
              : urgentOnly
                ? t("browse.urgentEmpty")
                : t("browse.emptyIdle")}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {ranked.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              showFavorite={showFavorite}
              favorited={favoriteIds.includes(offer.id)}
              perfectMatch={matchIds.includes(offer.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
