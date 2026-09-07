import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { loadActiveOffers, loadOfferById, loadOffersByIds } from "@/lib/offers/load-active-offers";

export const PUBLIC_OFFERS_TAG = "public-offers";
export const PUBLIC_OFFERS_REVALIDATE_SECONDS = 60;

export const loadActiveOffersCached = unstable_cache(
  async () => loadActiveOffers(),
  ["public-active-offers"],
  { revalidate: PUBLIC_OFFERS_REVALIDATE_SECONDS, tags: [PUBLIC_OFFERS_TAG] },
);

export const loadOfferByIdCached = unstable_cache(
  async (id: string) => loadOfferById(id),
  ["public-offer-by-id"],
  { revalidate: PUBLIC_OFFERS_REVALIDATE_SECONDS, tags: [PUBLIC_OFFERS_TAG] },
);

export const loadOffersByIdsCached = unstable_cache(
  async (ids: string[]) => loadOffersByIds(ids),
  ["public-offers-by-ids"],
  { revalidate: PUBLIC_OFFERS_REVALIDATE_SECONDS, tags: [PUBLIC_OFFERS_TAG] },
);

export function revalidatePublicOffers() {
  revalidateTag(PUBLIC_OFFERS_TAG);
  revalidatePath("/offers");
  revalidatePath("/dashboard");
}
