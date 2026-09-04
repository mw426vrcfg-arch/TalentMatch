"use client";

import { AppHeader } from "@/components/app/app-header";
import { useT } from "@/components/i18n/i18n-provider";

const BLOCK = "animate-pulse bg-neutral-200/50";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`${BLOCK} ${className}`.trim()} />;
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-11/12", "w-9/12", "w-10/12", "w-8/12"];

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={`h-3 rounded-full ${widths[index % widths.length]}`} />
      ))}
    </div>
  );
}

/** Glaskarte in der Form von .ui-card, gefüllt mit Platzhaltern. */
export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={`rounded-[28px] border border-white/20 bg-white/70 p-5 shadow-[0_18px_50px_rgba(15,15,20,0.06)] backdrop-blur-md sm:p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/**
 * Rahmen für Route-Skeletons: gleiche Kopfzeile, gleicher Inhaltsbereich und
 * gleiche Tab-Leiste wie die echten Shells, damit beim Wechsel nichts springt.
 */
export function SkeletonScreen({ tabs = 4, children }: { tabs?: number; children: React.ReactNode }) {
  const t = useT();
  return (
    <main className="min-h-screen pb-24" role="status" aria-label={t("common.loadingContent")}>
      <AppHeader>
        <div className="min-w-0">
          <p className="app-header-brand font-serif text-xl tracking-tight text-ink">TalentMatch</p>
          <Skeleton className="mt-1.5 h-2.5 w-20 rounded-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </AppHeader>

      <div className="app-screen mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>

      <nav
        aria-hidden
        className="ui-tabbar pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-lg grid-flow-col auto-cols-fr px-2 pt-1">
          {Array.from({ length: tabs }).map((_, index) => (
            <li key={index} className="flex flex-col items-center gap-1 px-1 py-2">
              <Skeleton className="h-5 w-5 rounded-lg" />
              <Skeleton className="h-2 w-10 rounded-full" />
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}

export function SkeletonPageHead({ withMeta = true }: { withMeta?: boolean }) {
  return (
    <div className="mb-8 max-w-2xl">
      <Skeleton className="h-2.5 w-24 rounded-full" />
      <Skeleton className="mt-4 h-9 w-64 rounded-2xl sm:h-11 sm:w-80" />
      {withMeta ? <Skeleton className="mt-4 h-3 w-72 rounded-full" /> : null}
    </div>
  );
}

/** Entspricht OfferCard: Partner-Kachel, Titel, Preispaar, Slot-Chips. */
export function SkeletonOfferCard() {
  return (
    <SkeletonCard className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      <Skeleton className="mt-5 h-7 w-3/4 rounded-2xl sm:h-8" />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-xl" />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Skeleton className="h-2.5 w-12 rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>
    </SkeletonCard>
  );
}

export function SkeletonOfferGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonOfferCard key={index} />
      ))}
    </div>
  );
}

/** Zweispaltiges Masonry wie im Inspiration Feed, mit variablen Bildhöhen. */
export function SkeletonInspirationFeed({ count = 8 }: { count?: number }) {
  const heights = ["h-56", "h-72", "h-64", "h-80", "h-60", "h-72"];

  return (
    <div className="columns-2 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="mb-3 break-inside-avoid sm:mb-4">
          <Skeleton className={`w-full rounded-[22px] ${heights[index % heights.length]}`} />
        </div>
      ))}
    </div>
  );
}

/** Formularblock für Profil-Screens: Label plus Eingabefeld. */
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <SkeletonCard className="space-y-5">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-2.5 w-28 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-40 rounded-full" />
    </SkeletonCard>
  );
}

export function SkeletonListCard({ withActions = true }: { withActions?: boolean }) {
  return (
    <SkeletonCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-48 rounded-xl" />
          <Skeleton className="h-2.5 w-32 rounded-full" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <SkeletonText lines={2} className="mt-4" />
      {withActions ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      ) : null}
    </SkeletonCard>
  );
}

export function SkeletonList({ count = 3, withActions = true }: { count?: number; withActions?: boolean }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListCard key={index} withActions={withActions} />
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} className="space-y-3">
          <Skeleton className="h-2.5 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </SkeletonCard>
      ))}
    </div>
  );
}

/** Chatblasen im Wechsel links/rechts, passend zu AppointmentChat. */
export function SkeletonChat({ bubbles = 4 }: { bubbles?: number }) {
  const t = useT();
  const widths = ["w-40", "w-56", "w-32", "w-48", "w-44"];

  return (
    <div className="space-y-2" role="status" aria-label={t("common.loadingChat")}>
      {Array.from({ length: bubbles }).map((_, index) => {
        const mine = index % 2 === 1;
        return (
          <div key={index} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <Skeleton className={`h-10 max-w-[85%] rounded-2xl ${widths[index % widths.length]}`} />
          </div>
        );
      })}
    </div>
  );
}

/** Auswahl-Chips, z. B. freie Slots einer Verschiebungsanfrage. */
export function SkeletonChips({ count = 4 }: { count?: number }) {
  const t = useT();
  const widths = ["w-32", "w-28", "w-36", "w-24"];

  return (
    <div className="flex flex-wrap gap-2" role="status" aria-label={t("common.loadingSlots")}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={`h-8 rounded-full ${widths[index % widths.length]}`} />
      ))}
    </div>
  );
}
