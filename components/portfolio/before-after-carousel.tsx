"use client";

import { type BeforeAfterPair } from "@/lib/portfolio/before-after";
import { useT } from "@/components/i18n/i18n-provider";

export function BeforeAfterCarousel({ pairs }: { pairs: BeforeAfterPair[] }) {
  const t = useT();

  if (pairs.length === 0) {
    return <div className="ui-empty mt-4">{t("rating.galleryEmpty")}</div>;
  }

  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
      {pairs.map((pair) => (
        <article
          key={pair.id}
          className="w-[min(100%,28rem)] shrink-0 snap-center overflow-hidden rounded-[28px] border border-white/20 bg-white/70 shadow-[0_18px_50px_rgba(15,15,20,0.08)] backdrop-blur-md"
        >
          <div className="grid grid-cols-2">
            <figure>
              <img src={pair.before_url} alt={t("common.before")} className="h-56 w-full object-cover sm:h-64" />
              <figcaption className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                {t("common.before")}
              </figcaption>
            </figure>
            <figure className="border-l border-white/30">
              <img src={pair.after_url} alt={t("common.after")} className="h-56 w-full object-cover sm:h-64" />
              <figcaption className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                {t("common.after")}
              </figcaption>
            </figure>
          </div>
        </article>
      ))}
    </div>
  );
}
