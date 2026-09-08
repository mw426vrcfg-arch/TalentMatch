import {
  Skeleton,
  SkeletonOfferGrid,
  SkeletonPageHead,
} from "@/components/ui/skeleton";
import { SkeletonScreen } from "@/components/ui/skeleton-screen";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />
      <Skeleton className="mb-6 h-12 w-full rounded-full" />
      <SkeletonOfferGrid count={4} />
    </SkeletonScreen>
  );
}
