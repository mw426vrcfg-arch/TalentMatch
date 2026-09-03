import {
  Skeleton,
  SkeletonCard,
  SkeletonOfferGrid,
  SkeletonPageHead,
  SkeletonScreen,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <SkeletonPageHead />

      <section className="mb-12">
        <Skeleton className="h-7 w-56 rounded-2xl" />
        <div className="mt-6">
          <SkeletonOfferGrid count={2} />
        </div>
      </section>

      <section>
        <Skeleton className="h-7 w-52 rounded-2xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <SkeletonCard key={index} className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 rounded-xl" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
              <Skeleton className="h-10 w-32 rounded-full" />
            </SkeletonCard>
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
