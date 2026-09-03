"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APPLICATION_IMAGES_BUCKET } from "@/lib/applications/image-urls";
import { notesWithSlotRef } from "@/lib/applications/slot-from-notes";
import { createNotification } from "@/lib/notifications/create";
import { requireCustomer } from "@/lib/auth/require-customer";
import { isOfferBlocked, loadBlockedSalons } from "@/lib/blacklist/store";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { canSeeVipOffer } from "@/lib/loyalty/levels";
import { loadAvailableSlot, loadOfferById } from "@/lib/offers/load-active-offers";
import { readId, readText, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApplyFormState = {
  error?: string;
};

const IMAGE_KEYS = ["front", "back", "side"] as const;
const BUCKET = APPLICATION_IMAGES_BUCKET;
const MAX_BYTES = 5 * 1024 * 1024;

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === BUCKET);

  if (!exists) {
    await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
    });
  }
}

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) {
    return fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function applyToOfferAction(
  _prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const { user, profile } = await requireCustomer();
  const offerId = readId(formData, "offer_id");
  const slotId = readId(formData, "slot_id");
  const notes = readText(formData, "notes", TEXT_LIMITS.notes);

  if (!offerId || !slotId) {
    return { error: "Angebot oder Slot fehlt." };
  }

  const offer = await loadOfferById(offerId);
  const slot = await loadAvailableSlot(slotId, offerId);

  if (!offer || !slot) {
    return { error: "Dieser Slot ist ausgebucht oder nicht mehr verfügbar." };
  }

  const blocked = await loadBlockedSalons(user.id);
  if (isOfferBlocked(offer, blocked)) {
    return { error: "Dieser Salon nimmt aktuell keine Bewerbungen von dir an." };
  }

  const loyalty = await loadCustomerLoyalty(createAdminClient(), user.id);
  if (
    !canSeeVipOffer({
      vipEarlyAccess: offer.vip_early_access,
      createdAt: offer.created_at,
      level: loyalty.level,
    })
  ) {
    return { error: "VIP Early Access: dieses Angebot ist für dein Level noch nicht sichtbar." };
  }

  const files = IMAGE_KEYS.map((key) => formData.get(key));

  if (files.some((file) => !(file instanceof File) || file.size === 0)) {
    return { error: "Bitte Hair Images für Front, Back und Side hochladen." };
  }

  const imageFiles = files as File[];

  if (imageFiles.some((file) => !isImageFile(file))) {
    return { error: "Hair Images müssen Bilddateien sein (z. B. JPG oder PNG)." };
  }

  if (imageFiles.some((file) => file.size > MAX_BYTES)) {
    return { error: "Jedes Bild darf höchstens 5 MB groß sein." };
  }

  const admin = createAdminClient();
  await ensureBucket(admin);

  const uploaded_images: string[] = [];

  for (let index = 0; index < IMAGE_KEYS.length; index += 1) {
    const key = IMAGE_KEYS[index];
    const file = imageFiles[index];
    const path = `${user.id}/${offerId}/${Date.now()}-${key}.${fileExtension(file)}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      return { error: `Upload fehlgeschlagen (${key}): ${uploadError.message}` };
    }

    uploaded_images.push(path);
  }

  const stillOpen = await loadAvailableSlot(slotId, offerId);
  if (!stillOpen) {
    return { error: "Dieser Slot wurde soeben ausgebucht. Bitte wähle eine andere Uhrzeit." };
  }

  const { data: created, error: insertError } = await admin
    .from("applications")
    .insert({
      offer_id: offerId,
      customer_id: profile.id,
      uploaded_images,
      notes: notesWithSlotRef(notes, slotId, slot.start_time),
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: insertError?.message ?? "Bewerbung konnte nicht gespeichert werden." };
  }

  const { data: offerRow } = await admin
    .from("offers")
    .select("title, business_id")
    .eq("id", offerId)
    .maybeSingle();

  let salonUserId: string | undefined;
  if (offerRow?.business_id) {
    const { data: salon } = await admin
      .from("business_profiles")
      .select("user_id")
      .eq("id", offerRow.business_id)
      .maybeSingle();
    salonUserId = salon?.user_id as string | undefined;
  }

  if (salonUserId) {
    await createNotification(admin, {
      userId: salonUserId,
      type: "application_received",
      title: "Neue Bewerbung",
      message: `${profile.full_name || "Ein Kunde"} hat sich auf „${offer.title}“ beworben.`,
      applicationId: created.id,
      offerId,
    });
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/dashboard");
  redirect(`/dashboard/applications?applied=1`);
}
