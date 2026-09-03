import {
  SkeletonInspirationFeed,
  SkeletonPageHead,
  SkeletonScreen,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />
      <SkeletonInspirationFeed />
    </SkeletonScreen>
  );
}
