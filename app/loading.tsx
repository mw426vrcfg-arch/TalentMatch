"use client";

import { Skeleton, SkeletonPageHead, SkeletonOfferGrid } from "@/components/ui/skeleton";
import { useT } from "@/components/i18n/i18n-provider";

export default function Loading() {
  const t = useT();
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6" role="status" aria-label={t("common.loadingContent")}>
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
