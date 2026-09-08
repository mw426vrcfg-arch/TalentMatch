"use server";

import { revalidatePath } from "next/cache";
import {
  customTimeRequestChatMessage,
  isInvalidApplicationStatusError,
  notesWithCustomTime,
  REQUESTED_CUSTOM_TIME,
} from "@/lib/applications/custom-time";
import { APPLICATION_IMAGES_BUCKET } from "@/lib/applications/image-urls";
import { notesWithSlotRef } from "@/lib/applications/slot-from-notes";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { createNotification } from "@/lib/notifications/create";
import { requireCustomer } from "@/lib/auth/require-customer";
import { isOfferBlocked, loadBlockedSalons } from "@/lib/blacklist/store";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { canSeeVipOffer } from "@/lib/loyalty/levels";
import { insertChatMessage } from "@/lib/messages/store";
import { loadAvailableSlot, loadOfferById } from "@/lib/offers/load-active-offers";
import { readId, readText, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertFlexible } from "@/lib/supabase/flexible-write";

export type ApplyFormState = {
  error?: string;
  ok?: boolean;
  redirectTo?: string;
};

const IMAGE_KEYS = ["front", "back", "side"] as const;
const BUCKET = APPLICATION_IMAGES_BUCKET;
const MAX_BYTES = 5 * 1024 * 1024;

type Admin = ReturnType<typeof createAdminClient>;

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

async function ensureBucket(admin: Admin) {
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

function readHairFiles(formData: FormData) {
  return IMAGE_KEYS.map((key) => {
    const value = formData.get(key);
    return value instanceof File && value.size > 0 ? { key, file: value } : null;
  }).filter((entry): entry is { key: (typeof IMAGE_KEYS)[number]; file: File } => Boolean(entry));
}

function validateHairFiles(files: ReturnType<typeof readHairFiles>) {
  if (files.some((entry) => !isImageFile(entry.file))) {
    return "Hair Images müssen Bilddateien sein (z. B. JPG oder PNG).";
  }
  if (files.some((entry) => entry.file.size > MAX_BYTES)) {
    return "Jedes Bild darf höchstens 5 MB groß sein.";
  }
  return null;
}

async function uploadHairFiles(
  admin: Admin,
  userId: string,
  offerId: string,
  files: ReturnType<typeof readHairFiles>,
) {
  await ensureBucket(admin);
  const uploaded_images: string[] = [];

  for (const { key, file } of files) {
    const path = `${userId}/${offerId}/${Date.now()}-${key}.${fileExtension(file)}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      throw new Error(`Upload fehlgeschlagen (${key}): ${uploadError.message}`);
    }

    uploaded_images.push(path);
  }

  return uploaded_images;
}

async function notifySalonOfApplication(
  admin: Admin,
  offerId: string,
  offerTitle: string,
  customerName: string,
  applicationId: string,
  customTime?: string | null,
) {
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

  if (!salonUserId) {
    return;
  }

  await createNotification(admin, {
    userId: salonUserId,
    type: "application_received",
    title: customTime ? "Wunschtermin angefragt" : "Neue Bewerbung eingegangen",
    message: customTime
      ? `${customerName || "Ein Kunde"} möchte „${offerTitle}“ zu einer Wunschzeit: ${customTime}`
      : `${customerName || "Ein Kunde"} hat sich auf „${offerTitle}“ beworben.`,
    applicationId,
    offerId,
  });
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
    return { error: "Angebot oder Termin fehlt." };
  }

  const offer = await loadOfferById(offerId);
  const slot = await loadAvailableSlot(slotId, offerId);

  if (!offer || !slot) {
    return { error: "Diese Zeit ist ausgebucht oder nicht mehr verfügbar." };
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

  const files = readHairFiles(formData);
  if (files.length < 1) {
    return { error: "Bitte mindestens ein Haarfoto hochladen." };
  }

  const fileError = validateHairFiles(files);
  if (fileError) {
    return { error: fileError };
  }

  const admin = createAdminClient();

  let uploaded_images: string[];
  try {
    uploaded_images = await uploadHairFiles(admin, user.id, offerId, files);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload fehlgeschlagen." };
  }

  const stillOpen = await loadAvailableSlot(slotId, offerId);
  if (!stillOpen) {
    return { error: "Diese Zeit wurde soeben ausgebucht. Bitte wähle eine andere Uhrzeit." };
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

  await notifySalonOfApplication(admin, offerId, offer.title, profile.full_name, created.id);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/applications");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");
  return { ok: true, redirectTo: "/dashboard/applications?applied=1" };
}

export async function requestCustomTimeAction(
  _prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const { user, profile } = await requireCustomer();
  const offerId = readId(formData, "offer_id");
  const customTime = readText(formData, "custom_time_notes", TEXT_LIMITS.shortNote);
  const extraNotes = readText(formData, "notes", TEXT_LIMITS.notes);

  if (!offerId) {
    return { error: "Angebot fehlt." };
  }

  if (!customTime) {
    return { error: "Bitte dein Wunschdatum und Zeitfenster angeben." };
  }

  const offer = await loadOfferById(offerId);
  if (!offer) {
    return { error: "Dieses Angebot ist nicht mehr verfügbar." };
  }

  const blocked = await loadBlockedSalons(user.id);
  if (isOfferBlocked(offer, blocked)) {
    return { error: "Dieser Salon nimmt aktuell keine Bewerbungen von dir an." };
  }

  const admin = createAdminClient();
  const loyalty = await loadCustomerLoyalty(admin, user.id);
  if (
    !canSeeVipOffer({
      vipEarlyAccess: offer.vip_early_access,
      createdAt: offer.created_at,
      level: loyalty.level,
    })
  ) {
    return { error: "VIP Early Access: dieses Angebot ist für dein Level noch nicht sichtbar." };
  }

  const files = readHairFiles(formData);
  const fileError = validateHairFiles(files);
  if (fileError) {
    return { error: fileError };
  }

  let uploaded_images: string[] = [];
  if (files.length > 0) {
    try {
      uploaded_images = await uploadHairFiles(admin, user.id, offerId, files);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Upload fehlgeschlagen." };
    }
  } else {
    const loaded = await loadCustomerProfile(admin, user.id);
    uploaded_images = loaded.profile?.hair_portfolio ?? [];
    if (uploaded_images.length === 0) {
      return { error: "Bitte mindestens ein Haarfoto hochladen." };
    }
  }

  const notes = notesWithCustomTime(extraNotes, customTime);
  const payload: Record<string, unknown> = {
    offer_id: offerId,
    customer_id: profile.id,
    uploaded_images,
    notes,
    status: REQUESTED_CUSTOM_TIME,
    custom_time_notes: customTime,
  };

  let created: Record<string, unknown>;
  try {
    created = await insertFlexible(admin, "applications", payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isInvalidApplicationStatusError(message)) {
      return { error: message || "Bewerbung konnte nicht gespeichert werden." };
    }
    try {
      created = await insertFlexible(admin, "applications", {
        ...payload,
        status: "pending",
      });
    } catch (fallbackError) {
      return {
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : "Bewerbung konnte nicht gespeichert werden.",
      };
    }
  }

  const applicationId = String(created.id ?? "");
  if (!applicationId) {
    return { error: "Bewerbung konnte nicht gespeichert werden." };
  }

  try {
    await insertChatMessage(admin, {
      applicationId,
      senderId: user.id,
      body: customTimeRequestChatMessage(offer.title, customTime),
    });
  } catch (error) {
    console.error(
      "Wunschtermin-Chat konnte nicht gestartet werden:",
      error instanceof Error ? error.message : error,
    );
  }

  await notifySalonOfApplication(
    admin,
    offerId,
    offer.title,
    profile.full_name,
    applicationId,
    customTime,
  );

  revalidatePath("/business/dashboard");
  revalidatePath("/business/applications");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");
  return { ok: true, redirectTo: "/dashboard/applications?applied=custom" };
}
