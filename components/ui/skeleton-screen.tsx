import { AppHeader } from "@/components/app/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonScreen({
  tabs = 4,
  showTabBar = true,
  children,
}: {
  tabs?: number;
  showTabBar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      suppressHydrationWarning
      className={showTabBar ? "min-h-screen pb-24" : "min-h-screen"}
      role="status"
      aria-busy="true"
    >
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

      {showTabBar ? (
        <nav aria-hidden className="ui-tabbar pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto grid max-w-lg grid-flow-col auto-cols-fr px-2 pt-1">
            {Array.from({ length: tabs }).map((_, index) => (
              <li key={index} className="flex flex-col items-center gap-1 px-1 py-2">
                <Skeleton className="h-5 w-5 rounded-lg" />
                <Skeleton className="h-2 w-10 rounded-full" />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}
