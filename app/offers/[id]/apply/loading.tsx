import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";
import { SkeletonScreen } from "@/components/ui/skeleton-screen";

export default function Loading() {
  return (
    <SkeletonScreen showTabBar={false}>
      <SkeletonCard className="space-y-5">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        <SkeletonText lines={3} />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </SkeletonCard>
    </SkeletonScreen>
  );
}
