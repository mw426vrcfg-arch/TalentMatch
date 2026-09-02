"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/require-business";
import { inferServiceType } from "@/lib/offers/service-type";
import { createAdminClient } from "@/lib/supabase/admin";

export type OfferFormState = {
  error?: string;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const normalPrice = parsePrice(readString(formData, "normal_price"));
  const discountPrice = parsePrice(readString(formData, "discount_price"));
  const durationMinutes = Number(readString(formData, "duration_minutes"));
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

  if (slotStarts.length === 0) {
    return { error: "Bitte mindestens einen Available Slot mit Datum und Uhrzeit setzen." };
  }

  const slots = slotStarts.map((startValue) => {
    const start = new Date(startValue);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  });

  if (slots.some(({ start, end }) => Number.isNaN(start.getTime()) || end <= start)) {
    return { error: "Mindestens ein Slot hat ein ungültiges Datum oder eine ungültige Uhrzeit." };
  }

  const admin = createAdminClient();
  const { data: offer, error: offerError } = await admin
    .from("offers")
    .insert({
      business_id: business.id,
      title,
      description,
      service_type: inferServiceType(title),
      normal_price: normalPrice,
      discount_price: discountPrice,
      duration_minutes: durationMinutes,
      status: "active",
    })
    .select("id")
    .single();

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

  revalidatePath("/business/dashboard");
  redirect("/business/dashboard?created=1");
}
