import {
  SkeletonInspirationFeed,
  SkeletonPageHead,
} from "@/components/ui/skeleton";
import { SkeletonScreen } from "@/components/ui/skeleton-screen";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />
      <SkeletonInspirationFeed />
    </SkeletonScreen>
  );
}
