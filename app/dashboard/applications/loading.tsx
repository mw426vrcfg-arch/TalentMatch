import { SkeletonList, SkeletonPageHead, SkeletonScreen } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />
      <SkeletonList count={3} />
    </SkeletonScreen>
  );
}
