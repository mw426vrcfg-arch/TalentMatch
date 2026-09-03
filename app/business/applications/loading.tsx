import {
  Skeleton,
  SkeletonCard,
  SkeletonPageHead,
  SkeletonScreen,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />

      <div className="space-y-4">
        {[0, 1].map((index) => (
          <SkeletonCard key={index}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-44 rounded-xl" />
                <Skeleton className="h-2.5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Bewerbungsfotos neben dem Behandlungs-Pass */}
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((image) => (
                  <Skeleton key={image} className="aspect-square w-full rounded-2xl" />
                ))}
              </div>
              <div className="space-y-3 rounded-2xl border border-white/20 bg-white/60 p-4">
                <Skeleton className="h-2.5 w-32 rounded-full" />
                <SkeletonText lines={4} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-44 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonScreen>
  );
}
