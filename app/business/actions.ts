"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/require-business";
import { loadFollowerUserIds } from "@/lib/favorites/store";
import { createNotification } from "@/lib/notifications/create";
import { normalizeHairValue } from "@/lib/hair/criteria";
import { isImageFile, MAX_LOGO_BYTES, uploadOfferImage } from "@/lib/business/images";
import { refreshOfferAvailability, setInitialAvailableSlots } from "@/lib/offers/availability";
import { inferServiceType } from "@/lib/offers/service-type";
import { scheduleSlotsFromIso } from "@/lib/offers/slot-schedule";
import { loadUrgentMatchQuota } from "@/lib/offers/urgent-quota";
import { readId, readLine, readText, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import { missingColumnFromError } from "@/lib/supabase/flexible-write";

export type OfferFormState = {
  error?: string;
};

// Alle Formularwerte laufen durch den Sanitizer, bevor sie Supabase erreichen.
function readString(formData: FormData, key: string) {
  return readLine(formData, key, TEXT_LIMITS.title);
}

function parsePrice(value: string) {
  const normalized = value.replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

export async function createOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const { business } = await requireBusiness();

  if (!business) {
    return {
      error: "Kein Salonprofil gefunden. Bitte zuerst die Registrierung als Salon abschliessen.",
    };
  }

  const title = readLine(formData, "title", TEXT_LIMITS.title);
  const description = readText(formData, "description", TEXT_LIMITS.description);
  const normalPrice = parsePrice(readString(formData, "normal_price"));
  const discountPrice = parsePrice(readString(formData, "discount_price"));
  const durationMinutes = Number(readString(formData, "duration_minutes"));
  const isUrgent =
    formData.get("is_urgent") === "true" ||
    formData.get("is_urgent") === "on" ||
    formData.get("is_urgent") === "1";
  const vipEarlyAccess =
    formData.get("vip_early_access") === "true" ||
    formData.get("vip_early_access") === "on" ||
    formData.get("vip_early_access") === "1";
  const slotStarts = formData
    .getAll("slots")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!title || !description) {
    return { error: "Service Title und Description sind Pflichtfelder." };
  }

  if (!Number.isFinite(normalPrice) || normalPrice < 0) {
    return { error: "Bitte einen gültigen Normal Price in CHF angeben." };
  }

  if (!Number.isFinite(discountPrice) || discountPrice < 0) {
    return { error: "Bitte einen gültigen Discount Price in CHF angeben." };
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { error: "Duration muss in ganzen Minuten grösser als 0 sein." };
  }

  const scheduled = scheduleSlotsFromIso(slotStarts, durationMinutes);
  if (scheduled.error || !scheduled.slots) {
    return { error: scheduled.error ?? "Bitte mindestens einen Available Slot setzen." };
  }

  const slots = scheduled.slots;

  const admin = createAdminClient();
  if (isUrgent) {
    const quota = await loadUrgentMatchQuota(admin, business.id);
    if (quota.reached) {
      return {
        error: `Monatliches Limit für Last-Minute-Deals (${quota.used}/${quota.limit}) erreicht`,
      };
    }
  }

  const payload: Record<string, unknown> = {
    business_id: business.id,
    title,
    description,
    service_type: inferServiceType(title),
    normal_price: normalPrice,
    discount_price: discountPrice,
    duration_minutes: durationMinutes,
    status: "active",
    available_slots: slots.length,
    is_urgent: isUrgent,
    vip_early_access: vipEarlyAccess,
    wanted_hair_structure: normalizeHairValue("structure", readString(formData, "wanted_hair_structure")),
    wanted_hair_length: normalizeHairValue("length", readString(formData, "wanted_hair_length")),
    wanted_hair_chemical: normalizeHairValue("chemical", readString(formData, "wanted_hair_chemical")),
  };

  let { data: offer, error: offerError } = await admin
    .from("offers")
    .insert(payload)
    .select("id")
    .single();

  for (let attempt = 0; attempt < 6 && offerError; attempt += 1) {
    const match = offerError.message.match(/'([^']+)' column/i);
    if (!match || !(match[1] in payload)) {
      break;
    }
    delete payload[match[1]];
    const retry = await admin.from("offers").insert(payload).select("id").single();
    offer = retry.data;
    offerError = retry.error;
  }

  if (offerError || !offer) {
    return {
      error: offerError?.message ?? "Angebot konnte nicht gespeichert werden.",
    };
  }

  const { error: slotError } = await admin.from("offer_slots").insert(
    slots.map(({ start, end }) => ({
      offer_id: offer.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_booked: false,
    })),
  );

  if (slotError) {
    await admin.from("offers").delete().eq("id", offer.id);
    return { error: slotError.message };
  }

  await setInitialAvailableSlots(admin, offer.id, slots.length);

  const image = formData.get("offer_image");
  if (image instanceof File && image.size > 0) {
    if (!isImageFile(image)) {
      return { error: "Bitte ein JPEG, PNG oder WebP als Angebotsbild hochladen." };
    }
    if (image.size > MAX_LOGO_BYTES) {
      return { error: "Das Angebotsbild darf höchstens 2 MB haben." };
    }
    try {
      const imageUrl = await uploadOfferImage(admin, business.id, offer.id, image);
      const updated = await admin.from("offers").update({ image_url: imageUrl }).eq("id", offer.id);
      if (updated.error && !missingColumnFromError(updated.error.message)) {
        return { error: updated.error.message };
      }
    } catch (uploadError) {
      return {
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Angebotsbild konnte nicht hochgeladen werden.",
      };
    }
  }

  const followers = await loadFollowerUserIds(admin, business.id);
  await Promise.all(
    followers.map((userId) =>
      createNotification(admin, {
        userId,
        type: "offer_published",
        title: "Neues Last-Minute-Angebot",
        message: `Ein Salon, dem du folgst, hat „${title}“ veröffentlicht.`,
        offerId: offer.id,
      }),
    ),
  );

  revalidatePath("/business/dashboard");
  revalidatePath("/business/offers");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/favorites");
  revalidatePath("/offers");
  redirect("/business/offers?created=1");
}

export async function updateOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const { user, business } = await requireBusiness();

  if (!business) {
    return {
      error: "Kein Salonprofil gefunden. Bitte zuerst die Registrierung als Salon abschliessen.",
    };
  }

  const offerId = readId(formData, "offer_id");
  if (!offerId) {
    return { error: "Angebot nicht gefunden." };
  }

  const title = readLine(formData, "title", TEXT_LIMITS.title);
  const description = readText(formData, "description", TEXT_LIMITS.description);
  const normalPrice = parsePrice(readString(formData, "normal_price"));
  const discountPrice = parsePrice(readString(formData, "discount_price"));
  const durationMinutes = Number(readString(formData, "duration_minutes"));
  const isUrgent =
    formData.get("is_urgent") === "true" ||
    formData.get("is_urgent") === "on" ||
    formData.get("is_urgent") === "1";
  const vipEarlyAccess =
    formData.get("vip_early_access") === "true" ||
    formData.get("vip_early_access") === "on" ||
    formData.get("vip_early_access") === "1";
  const slotStarts = formData
    .getAll("slots")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!title || !description) {
    return { error: "Service Title und Description sind Pflichtfelder." };
  }
  if (!Number.isFinite(normalPrice) || normalPrice < 0) {
    return { error: "Bitte einen gültigen Normal Price in CHF angeben." };
  }
  if (!Number.isFinite(discountPrice) || discountPrice < 0) {
    return { error: "Bitte einen gültigen Discount Price in CHF angeben." };
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { error: "Duration muss in ganzen Minuten grösser als 0 sein." };
  }

  const admin = createAdminClient();
  let existing: { id: string; business_id: string; is_urgent?: boolean; image_url?: string | null } | null =
    null;
  let { data: loadedOffer, error: loadError } = await admin
    .from("offers")
    .select("id, business_id, is_urgent, image_url")
    .eq("id", offerId)
    .maybeSingle();

  if (loadError && missingColumnFromError(loadError.message)) {
    const retry = await admin
      .from("offers")
      .select("id, business_id, image_url")
      .eq("id", offerId)
      .maybeSingle();
    loadedOffer = retry.data
      ? { ...retry.data, is_urgent: false }
      : null;
    loadError = retry.error;
  }
  existing = loadedOffer;

  if (loadError || !existing) {
    return { error: loadError?.message ?? "Angebot nicht gefunden." };
  }
  const offerSalonId = String(
    (existing as { salon_id?: string }).salon_id || existing.business_id,
  );
  if (offerSalonId !== business.id && offerSalonId !== user.id) {
    return { error: "Du kannst nur deine eigenen Angebote bearbeiten." };
  }

  if (isUrgent && !existing.is_urgent) {
    const quota = await loadUrgentMatchQuota(admin, business.id);
    if (quota.reached) {
      return {
        error: `Monatliches Limit für Last-Minute-Deals (${quota.used}/${quota.limit}) erreicht`,
      };
    }
  }

  const { data: currentSlots, error: slotLoadError } = await admin
    .from("offer_slots")
    .select("id, start_time, end_time, is_booked")
    .eq("offer_id", offerId);

  if (slotLoadError) {
    return { error: slotLoadError.message };
  }

  const existingStarts = (currentSlots ?? [])
    .map((slot) => String(slot.start_time))
    .filter(Boolean);
  const existingTimes = new Set(existingStarts.map((iso) => new Date(iso).getTime()));
  const freshStarts = slotStarts.filter((iso) => !existingTimes.has(new Date(iso).getTime()));

  if (freshStarts.length > 0) {
    const scheduled = scheduleSlotsFromIso([...existingStarts, ...freshStarts], durationMinutes);
    if (scheduled.error || !scheduled.slots) {
      return { error: scheduled.error ?? "Die neuen Slots überschneiden sich mit bestehenden Zeiten." };
    }
  }

  const payload: Record<string, unknown> = {
    title,
    description,
    service_type: inferServiceType(title),
    normal_price: normalPrice,
    discount_price: discountPrice,
    duration_minutes: durationMinutes,
    is_urgent: isUrgent,
    vip_early_access: vipEarlyAccess,
    wanted_hair_structure: normalizeHairValue("structure", readString(formData, "wanted_hair_structure")),
    wanted_hair_length: normalizeHairValue("length", readString(formData, "wanted_hair_length")),
    wanted_hair_chemical: normalizeHairValue("chemical", readString(formData, "wanted_hair_chemical")),
  };

  let { error: updateError } = await admin
    .from("offers")
    .update(payload)
    .eq("id", offerId)
    .eq("business_id", business.id);

  for (let attempt = 0; attempt < 6 && updateError; attempt += 1) {
    const column = missingColumnFromError(updateError.message);
    if (!column || !(column in payload)) {
      break;
    }
    delete payload[column];
    const retry = await admin.from("offers").update(payload).eq("id", offerId).eq("business_id", business.id);
    updateError = retry.error;
  }

  if (updateError) {
    return { error: updateError.message };
  }

  if (freshStarts.length > 0) {
    const scheduled = scheduleSlotsFromIso(freshStarts, durationMinutes);
    if (scheduled.error || !scheduled.slots) {
      return { error: scheduled.error ?? "Neue Slots konnten nicht gespeichert werden." };
    }
    const { error: insertError } = await admin.from("offer_slots").insert(
      scheduled.slots.map(({ start, end }) => ({
        offer_id: offerId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_booked: false,
      })),
    );
    if (insertError) {
      return { error: insertError.message };
    }
  }

  const image = formData.get("offer_image");
  if (image instanceof File && image.size > 0) {
    if (!isImageFile(image)) {
      return { error: "Bitte ein JPEG, PNG oder WebP als Angebotsbild hochladen." };
    }
    if (image.size > MAX_LOGO_BYTES) {
      return { error: "Das Angebotsbild darf höchstens 2 MB haben." };
    }
    try {
      const imageUrl = await uploadOfferImage(admin, business.id, offerId, image);
      const updated = await admin
        .from("offers")
        .update({ image_url: imageUrl })
        .eq("id", offerId)
        .eq("business_id", business.id);
      if (updated.error && !missingColumnFromError(updated.error.message)) {
        return { error: updated.error.message };
      }
    } catch (uploadError) {
      return {
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Angebotsbild konnte nicht hochgeladen werden.",
      };
    }
  }

  await refreshOfferAvailability(admin, offerId);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/offers");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/favorites");
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  redirect("/business/offers?updated=1");
}
