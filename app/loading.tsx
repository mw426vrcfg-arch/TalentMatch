import { Skeleton, SkeletonPageHead, SkeletonOfferGrid } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6" role="status" aria-label="Inhalte werden geladen">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-6 w-40 rounded-xl" />
        <div className="mt-10">
          <SkeletonPageHead />
          <SkeletonOfferGrid count={2} />
        </div>
      </div>
    </div>
  );
}
