"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth/require-business";
import { requireCustomer } from "@/lib/auth/require-customer";
import { createAdminClient } from "@/lib/supabase/admin";
import { savePortfolioPair, uploadBeforeAfterImage } from "@/lib/portfolio/before-after";
import { readId, readText, TEXT_LIMITS } from "@/lib/security/sanitize";
import { submitRating } from "@/lib/ratings/store";
import { applyGoodBehaviorReset } from "@/lib/strikes/good-behavior";

export type RatingFormState = {
  error?: string;
  success?: string;
};

function readRating(formData: FormData) {
  const value = Number(String(formData.get("rating") ?? ""));
  return Number.isInteger(value) ? value : NaN;
}

export async function submitCustomerRatingAction(
  _prev: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  const { user } = await requireCustomer();
  return saveRating(user.id, formData, "/dashboard");
}

export async function submitSalonRatingAction(
  _prev: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  const { user } = await requireBusiness();
  return saveRating(user.id, formData, "/business/dashboard");
}

async function saveRating(fromUserId: string, formData: FormData, path: string) {
  const bookingId = readId(formData, "booking_id");
  const applicationId = readId(formData, "application_id");
  const bookingRowId = readId(formData, "booking_row_id");
  const revieweeId = readId(formData, "reviewee_id");
  const comment = readText(formData, "comment", TEXT_LIMITS.comment);
  const rating = readRating(formData);

  if (!bookingId && !applicationId) {
    return { error: "Termin fehlt. Bitte das Bewertungsfenster neu laden." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Bitte 1 bis 5 Sterne wählen." };
  }
  if (!comment) {
    return { error: "Bitte einen kurzen Text hinterlassen." };
  }

  try {
    const saved = await submitRating({
      fromUserId,
      bookingId: applicationId || bookingId,
      applicationId,
      bookingRowId,
      revieweeId,
      rating,
      comment,
    });

    const before = formData.get("before_image");
    const after = formData.get("after_image");
    if (saved.isSalon && before instanceof File && before.size > 0 && after instanceof File && after.size > 0) {
      const admin = createAdminClient();
      const beforeUrl = await uploadBeforeAfterImage(admin, saved.salonUserId, "before", before);
      const afterUrl = await uploadBeforeAfterImage(admin, saved.salonUserId, "after", after);
      await savePortfolioPair(admin, {
        ratingId: saved.ratingId,
        salonUserId: saved.salonUserId,
        beforeUrl,
        afterUrl,
      });
    }

    if (saved.isSalon && rating >= 4 && saved.customerId) {
      await applyGoodBehaviorReset(saved.customerId);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Bewertung konnte nicht gespeichert werden.",
    };
  }

  revalidatePath(path);
  revalidatePath("/offers");
  revalidatePath("/dashboard/profile");
  revalidatePath("/business/profile");
  return { success: "Danke, deine Bewertung ist gespeichert." };
}
