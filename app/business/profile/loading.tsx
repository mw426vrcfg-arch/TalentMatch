import {
  Skeleton,
  SkeletonCard,
  SkeletonForm,
  SkeletonPageHead,
} from "@/components/ui/skeleton";
import { SkeletonScreen } from "@/components/ui/skeleton-screen";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />

      <SkeletonCard className="mb-8 flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-xl" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
      </SkeletonCard>

      <SkeletonForm fields={6} />
    </SkeletonScreen>
  );
}
