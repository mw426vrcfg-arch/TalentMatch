import {
  Skeleton,
  SkeletonCard,
  SkeletonForm,
  SkeletonPageHead,
  SkeletonScreen,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <SkeletonCard className="space-y-3">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </SkeletonCard>
        <SkeletonCard className="space-y-3">
          <Skeleton className="h-2.5 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-3 w-36 rounded-full" />
        </SkeletonCard>
      </div>

      <SkeletonForm fields={5} />
    </SkeletonScreen>
  );
}
