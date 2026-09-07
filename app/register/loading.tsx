import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen px-6 py-16" role="status" aria-busy="true">
      <div className="mx-auto max-w-md space-y-6">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        <SkeletonText lines={2} />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
