import {
  Skeleton,
  SkeletonOfferGrid,
  SkeletonPageHead,
  SkeletonScreen,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />
      <Skeleton className="mb-6 h-12 w-full rounded-full" />
      <SkeletonOfferGrid count={4} />
    </SkeletonScreen>
  );
}
