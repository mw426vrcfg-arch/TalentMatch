import {
  Skeleton,
  SkeletonCard,
  SkeletonScreen,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonCard className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-36 rounded-full" />
              <Skeleton className="h-2.5 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>

        <Skeleton className="h-10 w-3/4 rounded-2xl sm:h-12" />
        <SkeletonText lines={3} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-2.5 w-12 rounded-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>
        </div>

        <Skeleton className="h-12 w-full rounded-full sm:w-56" />
      </SkeletonCard>
    </SkeletonScreen>
  );
}
