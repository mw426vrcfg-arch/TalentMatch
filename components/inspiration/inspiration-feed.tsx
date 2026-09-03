"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { canSeeVipOffer, type MemberLevel, vipUnlockAt } from "@/lib/loyalty/levels";
import { formatChf } from "@/lib/offers/format";
import { earliestUnbookedSlot } from "@/lib/offers/load-active-offers";
import { type InspirationTile } from "@/lib/inspiration/feed";
import { SlotChoices } from "@/components/offers/slot-choices";
import { FavoriteHeart } from "@/components/offers/favorite-heart";
import { UrgentCountdown } from "@/components/offers/urgent-countdown";
import { UrgentBadge } from "@/components/offers/offer-card";
import { VipWaitNotice } from "@/components/offers/vip-wait-notice";

const PAGE = 8;

export function InspirationFeed({
  tiles,
  memberLevel,
  favoriteIds = [],
  showFavorite = false,
}: {
  tiles: InspirationTile[];
  memberLevel: MemberLevel;
  favoriteIds?: string[];
  showFavorite?: boolean;
}) {
  const [visible, setVisible] = useState(PAGE);
  const [active, setActive] = useState<InspirationTile | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

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
        <p className="font-serif text-2xl text-ink">Noch keine Ergebnisse</p>
        <p className="mt-2 text-sm text-ink-soft">
          Sobald Salons Vorher-Nachher teilen, erscheint der Feed hier.
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
              className="relative w-full overflow-hidden rounded-[22px] border border-white/20 bg-white/70 text-left shadow-[0_14px_40px_rgba(15,15,20,0.08)] backdrop-blur-md"
            >
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
                  <img src={image} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-end bg-gradient-to-br from-zinc-200 via-white to-zinc-100 p-5">
                    <p className="font-serif text-2xl leading-tight text-ink">
                      {tile.offer?.title || "Beauty"}
                    </p>
                  </div>
                )}
                <div className="px-4 py-3.5">
                  <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                    {tile.region}
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

      {active ? (
        <div
          data-ptr-ignore
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-white/20 bg-white/90 p-5 shadow-[0_30px_80px_rgba(15,15,20,0.24)] backdrop-blur-xl sm:rounded-[32px] sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-kicker">{active.region}</p>
                <h2 className="mt-2 font-serif text-3xl text-ink">
                  {active.offer?.title || "Ergebnis"}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{active.partner_name}</p>
              </div>
              <button type="button" onClick={() => setActive(null)} className="ui-btn-secondary px-3 text-xs">
                Schliessen
              </button>
            </div>
            {active.after_url ? (
              <div className="mt-5 overflow-hidden rounded-[22px] border border-white/30">
                {active.before_url ? (
                  <div className="grid grid-cols-2">
                    <img src={active.before_url} alt="Vorher" className="h-40 w-full object-cover" />
                    <img src={active.after_url} alt="Nachher" className="h-40 w-full object-cover" />
                  </div>
                ) : (
                  <img src={active.after_url} alt="" className="aspect-[4/3] w-full object-cover" />
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
                          <p className="ui-kicker">Discount</p>
                          <p className="mt-1 font-serif text-3xl text-ink">{formatChf(active.offer.discount_price)}</p>
                        </div>
                        <div>
                          <p className="ui-kicker">Original</p>
                          <p className="mt-1 text-lg text-ink-soft line-through">
                            {formatChf(active.offer.normal_price)}
                          </p>
                        </div>
                      </div>
                      {vipOpen ? (
                        <>
                          <div className="mt-5">
                            <SlotChoices offerId={active.offer.id} slots={active.offer.slots} />
                          </div>
                          <Link href={`/offers/${active.offer.id}`} className="ui-btn-primary mt-5 w-full">
                            Jetzt bewerben
                          </Link>
                        </>
                      ) : (
                        <p className="mt-5 text-sm text-ink-soft">
                          Sammle Beauty Points für Silber, um VIP-Deals sofort zu sehen.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="mt-5 text-sm text-ink-soft">Aktuell kein offener Deal in {active.region}.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
