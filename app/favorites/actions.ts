"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth/require-customer";
import { toggleFavoriteOffer, toggleFollowSalon } from "@/lib/favorites/store";

export async function toggleFavoriteAction(offerId: string) {
  const { user } = await requireCustomer();
  const saved = await toggleFavoriteOffer(user.id, offerId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/favorites");
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  return saved;
}

export async function toggleFollowAction(salonId: string) {
  const { user } = await requireCustomer();
  const following = await toggleFollowSalon(user.id, salonId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/favorites");
  revalidatePath("/offers");
  return following;
}
