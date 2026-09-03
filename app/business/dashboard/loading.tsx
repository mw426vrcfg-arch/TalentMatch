import {
  Skeleton,
  SkeletonList,
  SkeletonScreen,
  SkeletonStatGrid,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <div className="mb-8 max-w-2xl">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="mt-4 h-9 w-64 rounded-2xl sm:h-11 sm:w-80" />
        <Skeleton className="mt-3 h-3 w-32 rounded-full" />
      </div>

      <div className="mb-10">
        <Skeleton className="mb-4 h-2.5 w-40 rounded-full" />
        <SkeletonStatGrid count={3} />
      </div>

      <div className="mb-10">
        <Skeleton className="mb-4 h-2.5 w-44 rounded-full" />
        <SkeletonStatGrid count={3} />
      </div>

      <Skeleton className="mb-4 h-7 w-48 rounded-2xl" />
      <SkeletonList count={2} />
    </SkeletonScreen>
  );
}
