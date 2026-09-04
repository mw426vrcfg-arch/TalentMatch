"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { canSeeVipOffer, type MemberLevel, vipUnlockAt } from "@/lib/loyalty/levels";
import { formatChf } from "@/lib/offers/format";
import { earliestUnbookedSlot } from "@/lib/offers/load-active-offers";
import type { InspirationTile } from "@/lib/inspiration/types";
import { SlotChoices } from "@/components/offers/slot-choices";
import { FavoriteHeart } from "@/components/offers/favorite-heart";
import { UrgentCountdown } from "@/components/offers/urgent-countdown";
import { UrgentBadge } from "@/components/offers/offer-card";
import { VipWaitNotice } from "@/components/offers/vip-wait-notice";
import { useT, useLocalize } from "@/components/i18n/i18n-provider";
import { LocalizedText } from "@/components/i18n/localized-text";
import { CoverImage } from "@/components/ui/cover-image";

const PAGE = 8;

export function InspirationFeed({
  tiles,
  memberLevel,
  favoriteIds = [],
  showFavorite = false,
  canApply = true,
  emptyQuery,
  urgentOnly = false,
}: {
  tiles: InspirationTile[];
  memberLevel: MemberLevel;
  favoriteIds?: string[];
  showFavorite?: boolean;
  canApply?: boolean;
  emptyQuery?: string;
  urgentOnly?: boolean;
}) {
  const t = useT();
  const localize = useLocalize();
  const [visible, setVisible] = useState(PAGE);
  const [active, setActive] = useState<InspirationTile | null>(null);
  const [mounted, setMounted] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shown = useMemo(() => tiles.slice(0, visible), [tiles, visible]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible((count) => Math.min(tiles.length, count + PAGE));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [tiles.length]);

  if (tiles.length === 0) {
    return (
      <div className="ui-empty mt-10 py-16 text-center">
        <p className="font-serif text-2xl text-ink">
          {emptyQuery ? t("browse.emptyTitle") : urgentOnly ? t("browse.urgentEmptyTitle") : t("inspiration.emptyTitle")}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {emptyQuery
            ? t("browse.emptyQueryHint", { query: emptyQuery })
            : urgentOnly
              ? t("browse.urgentEmpty")
              : t("inspiration.emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {shown.map((tile) => {
          const image = tile.after_url || tile.before_url;
          const urgentSlot = tile.offer?.is_urgent ? earliestUnbookedSlot(tile.offer) : null;
          return (
            <article
              key={tile.id}
              className={`relative w-full overflow-hidden rounded-[22px] border text-left shadow-[0_14px_40px_rgba(15,15,20,0.08)] backdrop-blur-xl transition-all duration-300 ease-out ${
                tile.offer?.is_urgent ? "ui-card-urgent border-zinc-900/20" : "border-white/20 bg-white/70"
              }`}
            >
              {tile.offer?.is_urgent ? (
                <div className="absolute top-3 left-3 z-20">
                  <UrgentBadge />
                </div>
              ) : null}
              {showFavorite && tile.offer ? (
                <div className="absolute top-3 right-3 z-20">
                  <FavoriteHeart
                    offerId={tile.offer.id}
                    initialSaved={favoriteIds.includes(tile.offer.id)}
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setActive(tile)}
                className="w-full text-left transition-all duration-300 ease-out hover:scale-[1.015] active:scale-95"
              >
                {image ? (
                  <CoverImage src={image} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-end bg-gradient-to-br from-zinc-200 via-white to-zinc-100 p-5">
                    <p className="font-serif text-2xl leading-tight text-ink">
                      {tile.offer?.title || "Beauty"}
                    </p>
                  </div>
                )}
                <div className="px-4 py-3.5">
                  <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                    <LocalizedText text={tile.region} />
                  </p>
                  {tile.offer?.title ? (
                    <p className="mt-1.5 truncate font-serif text-xl text-ink">{tile.offer.title}</p>
                  ) : null}
                  {tile.offer?.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                      {tile.offer.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {tile.offer ? (
                      <>
                        <span className="font-serif text-lg text-ink">
                          {formatChf(tile.offer.discount_price)}
                        </span>
                        <span className="text-sm text-ink-soft line-through">
                          {formatChf(tile.offer.normal_price)}
                        </span>
                      </>
                    ) : null}
                    {urgentSlot ? <UrgentCountdown iso={urgentSlot.start_time} /> : null}
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
      {visible < tiles.length ? <div ref={sentinel} className="h-10" /> : null}

      {mounted && active
        ? createPortal(
            <div
              data-ptr-ignore
              className="ui-overlay fixed inset-0 z-[80] flex items-end justify-center bg-zinc-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
              onClick={() => setActive(null)}
              role="presentation"
            >
          <div
            className="ui-sheet mb-[env(safe-area-inset-bottom)] max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-white/20 bg-white/90 p-5 pb-8 shadow-[0_30px_80px_rgba(15,15,20,0.24)] backdrop-blur-xl sm:mb-0 sm:rounded-[32px] sm:p-8"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-kicker">
                  <LocalizedText text={active.region} />
                </p>
                <h2 className="mt-2 font-serif text-3xl text-ink">
                  {active.offer?.title || t("common.result")}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{active.partner_name}</p>
              </div>
              <button type="button" onClick={() => setActive(null)} className="ui-btn-secondary px-3 text-xs">
                {t("common.close")}
              </button>
            </div>
            {active.after_url ? (
              <div className="mt-5 overflow-hidden rounded-[22px] border border-white/30">
                {active.before_url ? (
                  <div className="grid grid-cols-2">
                    <CoverImage src={active.before_url} alt={t("common.before")} className="h-40 w-full object-cover" />
                    <CoverImage src={active.after_url} alt={t("common.after")} className="h-40 w-full object-cover" />
                  </div>
                ) : (
                  <CoverImage src={active.after_url} className="aspect-[4/3] w-full object-cover" />
                )}
              </div>
            ) : null}
            {active.offer ? (
              <div className="mt-6">
                {(() => {
                  const vipOpen = canSeeVipOffer({
                    vipEarlyAccess: active.offer.vip_early_access,
                    createdAt: active.offer.created_at,
                    level: memberLevel,
                  });
                  const liveSlot = earliestUnbookedSlot(active.offer);
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {active.offer.is_urgent ? <UrgentBadge /> : null}
                        {active.offer.is_urgent && liveSlot ? (
                          <UrgentCountdown iso={liveSlot.start_time} />
                        ) : null}
                      </div>
                      {!vipOpen ? (
                        <div className="mt-4">
                          <VipWaitNotice unlockAt={vipUnlockAt(active.offer.created_at)} />
                        </div>
                      ) : null}
                      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                        {active.offer.description}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="ui-kicker">{t("browse.discount")}</p>
                          <p className="mt-1 font-serif text-3xl text-ink">{formatChf(active.offer.discount_price)}</p>
                        </div>
                        <div>
                          <p className="ui-kicker">{t("browse.original")}</p>
                          <p className="mt-1 text-lg text-ink-soft line-through">
                            {formatChf(active.offer.normal_price)}
                          </p>
                        </div>
                      </div>
                      {vipOpen && canApply ? (
                        <>
                          <div className="mt-5">
                            <SlotChoices offerId={active.offer.id} slots={active.offer.slots} />
                          </div>
                          <Link href={`/offers/${active.offer.id}`} className="ui-btn-primary mt-5 w-full">
                            {t("offer.applyCta")}
                          </Link>
                        </>
                      ) : vipOpen ? (
                        <>
                          <div className="mt-5">
                            <SlotChoices offerId={active.offer.id} slots={active.offer.slots} canApply={false} />
                          </div>
                          <Link href={`/offers/${active.offer.id}`} className="ui-btn-secondary mt-5 w-full">
                            {t("browse.viewOffer")}
                          </Link>
                        </>
                      ) : (
                        <p className="mt-5 text-sm text-ink-soft">
                          {t("loyalty.collectForVip")}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="mt-5 text-sm text-ink-soft">
                {t("inspiration.noDeal", { region: localize(active.region) })}
              </p>
            )}
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
