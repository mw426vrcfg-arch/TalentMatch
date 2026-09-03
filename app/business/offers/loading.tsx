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
      <Skeleton className="mb-10 h-12 w-56 rounded-full" />

      <Skeleton className="mb-6 h-7 w-44 rounded-2xl" />
      <div className="space-y-4">
        {[0, 1].map((index) => (
          <SkeletonCard key={index}>
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-7 w-56 rounded-xl" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonText lines={2} className="mt-3" />
            <Skeleton className="mt-4 h-3 w-64 rounded-full" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-2.5 w-28 rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full" />
              <Skeleton className="h-3 w-36 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonScreen>
  );
}
