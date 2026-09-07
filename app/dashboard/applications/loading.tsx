import { SkeletonList, SkeletonPageHead } from "@/components/ui/skeleton";
import { SkeletonScreen } from "@/components/ui/skeleton-screen";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />
      <SkeletonList count={3} />
    </SkeletonScreen>
  );
}
