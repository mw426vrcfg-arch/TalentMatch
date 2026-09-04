"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { InspirationFeed } from "@/components/inspiration/inspiration-feed";
import { UrgentFilterToggle } from "@/components/offers/urgent-filter";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";
import { pinUrgentTiles, searchInspirationTiles } from "@/lib/offers/fuzzy-search";
import { isUrgentFlag } from "@/lib/offers/urgent-flag";
import type { InspirationTile } from "@/lib/inspiration/types";
import { type MemberLevel } from "@/lib/loyalty/levels";

export function HomeOfferSearch({
  tiles,
  initialQuery = "",
  memberLevel,
  favoriteIds = [],
  showFavorite = false,
  canApply = true,
  children,
}: {
  tiles: InspirationTile[];
  initialQuery?: string;
  memberLevel: MemberLevel;
  favoriteIds?: string[];
  showFavorite?: boolean;
  canApply?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const localize = useLocalize();
  const [query, setQuery] = useState(initialQuery);
  const [urgentOnly, setUrgentOnly] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filtered = useMemo(() => {
    const searched = searchInspirationTiles(tiles, query, locale, localize);
    const scoped = urgentOnly ? searched.filter((tile) => isUrgentFlag(tile.offer?.is_urgent)) : searched;
    return pinUrgentTiles(scoped);
  }, [tiles, query, locale, localize, urgentOnly]);
  const searching = query.trim().length > 0;
  const filtering = searching || urgentOnly;

  return (
    <>
      <label className="block">
        <span className="ui-input flex items-center gap-3 rounded-full py-2.5 backdrop-blur-xl">
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
            <button type="button" onClick={() => setQuery("")} className="ui-btn-secondary px-3 py-1 text-[11px]">
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
          ? filtered.length === 1
            ? t("browse.hitsOne")
            : t("browse.hitsMany", { count: filtered.length })
          : t("browse.searchIntro")}
      </p>
      {children}
      <div className="mt-8">
        <InspirationFeed
          key={`${locale}-${query}-${urgentOnly ? "urgent" : "all"}`}
          tiles={filtered}
          memberLevel={memberLevel}
          favoriteIds={favoriteIds}
          showFavorite={showFavorite}
          canApply={canApply}
          emptyQuery={searching ? query.trim() : undefined}
          urgentOnly={urgentOnly}
        />
      </div>
    </>
  );
}
