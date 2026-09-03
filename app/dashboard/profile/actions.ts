"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth/require-customer";
import {
  isImageFile,
  MAX_AVATAR_BYTES,
  uploadCustomerAvatar,
} from "@/lib/customer/images";
import {
  loadHairPortfolio,
  MAX_PORTFOLIO_BYTES,
  MAX_PORTFOLIO_IMAGES,
  persistHairPortfolio,
  portfolioPathFromUrl,
  removePortfolioImage,
  uploadPortfolioImage,
} from "@/lib/customer/portfolio";
import { normalizeHairValue } from "@/lib/hair/criteria";
import { normalizeThickness } from "@/lib/customer/treatment-pass";
import { loadCustomerProfile, saveCustomerProfile } from "@/lib/customer/profile-store";
import { readLine, readText, sanitizeLine, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerProfileFormState = {
  error?: string;
};

// Alle Formularwerte laufen durch den Sanitizer, bevor sie Supabase erreichen.
function readString(formData: FormData, key: string) {
  return readLine(formData, key, TEXT_LIMITS.shortNote);
}

export async function updateCustomerProfileAction(
  _prev: CustomerProfileFormState,
  formData: FormData,
): Promise<CustomerProfileFormState> {
  const { user } = await requireCustomer();
  const fullName = readLine(formData, "full_name", TEXT_LIMITS.name);
  const bio = readText(formData, "bio", TEXT_LIMITS.bio);
  const avatar = formData.get("avatar");

  if (!fullName) {
    return { error: "Bitte deinen vollen Namen angeben." };
  }

  const admin = createAdminClient();
  const loaded = await loadCustomerProfile(admin, user.id);
  let avatarUrl = loaded.profile?.avatar_url ?? null;

  if (avatar instanceof File && avatar.size > 0) {
    if (!isImageFile(avatar)) {
      return { error: "Das Profilbild muss eine Bilddatei sein (JPG, PNG oder WebP)." };
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { error: "Das Profilbild darf höchstens 2 MB groß sein." };
    }

    try {
      avatarUrl = await uploadCustomerAvatar(admin, user.id, avatar);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? `Bild-Upload fehlgeschlagen: ${error.message}`
            : "Bild-Upload fehlgeschlagen.",
      };
    }
  }

  let droppedColumns: string[] = [];

  try {
    await admin.from("users").update({ full_name: fullName }).eq("id", user.id);

    const saved = await saveCustomerProfile(admin, {
      userId: user.id,
      full_name: fullName,
      bio: bio || null,
      avatar_url: avatarUrl,
      hair: {
        structure: normalizeHairValue("structure", readString(formData, "hair_structure")),
        length: normalizeHairValue("length", readString(formData, "hair_length")),
        chemical: normalizeHairValue("chemical", readString(formData, "hair_chemical")),
      },
      treatment_pass: {
        last_bleaching: readString(formData, "last_bleaching") || null,
        chemical_treatments: readString(formData, "chemical_treatments") || null,
        hair_thickness: normalizeThickness(readString(formData, "hair_thickness")),
      },
    });

    droppedColumns = saved.droppedColumns;

    if (avatarUrl) {
      const { error: pictureError } = await admin
        .from("customer_profiles")
        .update({ profile_picture_url: avatarUrl })
        .eq("user_id", user.id);
      if (pictureError && !/could not find the 'profile_picture_url' column/i.test(pictureError.message)) {
        throw new Error(pictureError.message);
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.",
    };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath("/business/dashboard");

  const missing = droppedColumns.length > 0 ? `&missing=${encodeURIComponent(droppedColumns.join(","))}` : "";
  redirect(`/dashboard/profile?saved=1${missing}`);
}

export type HairPortfolioFormState = {
  error?: string;
};

export async function addHairPortfolioImagesAction(
  _prev: HairPortfolioFormState,
  formData: FormData,
): Promise<HairPortfolioFormState> {
  const { user } = await requireCustomer();
  const files = formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    return { error: "Bitte mindestens ein Bild auswählen." };
  }

  const admin = createAdminClient();
  const loaded = await loadCustomerProfile(admin, user.id);
  const current = await loadHairPortfolio(
    admin,
    user.id,
    loaded.row ?? (loaded.profile ? { hair_portfolio: loaded.profile.hair_portfolio } : null),
  );

  const remaining = MAX_PORTFOLIO_IMAGES - current.length;
  if (remaining <= 0) {
    return { error: "Dein Haar-Portfolio ist voll (maximal 6 Bilder)." };
  }

  const next = [...current];
  let persisted = true;

  try {
    for (const file of files.slice(0, remaining)) {
      if (!isImageFile(file)) {
        return { error: "Nur Bilddateien sind erlaubt (JPG, PNG oder WebP)." };
      }
      if (file.size > MAX_PORTFOLIO_BYTES) {
        return { error: "Jedes Bild darf höchstens 2 MB groß sein." };
      }
      next.push(await uploadPortfolioImage(admin, user.id, file));
    }
    persisted = (await persistHairPortfolio(admin, user.id, next)).persisted;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Upload fehlgeschlagen: ${error.message}`
          : "Upload fehlgeschlagen.",
    };
  }

  revalidatePath("/dashboard/profile");
  redirect(`/dashboard/profile?portfolio=1${persisted ? "" : "&missing=hair_portfolio"}`);
}

export async function removeHairPortfolioImageAction(formData: FormData) {
  const { user } = await requireCustomer();
  const stored = sanitizeLine(formData.get("url"), 1024);
  if (!stored) {
    return;
  }

  const admin = createAdminClient();
  const loaded = await loadCustomerProfile(admin, user.id);
  const current = await loadHairPortfolio(
    admin,
    user.id,
    loaded.row ?? (loaded.profile ? { hair_portfolio: loaded.profile.hair_portfolio } : null),
  );

  try {
    await removePortfolioImage(admin, user.id, stored);
    await persistHairPortfolio(
      admin,
      user.id,
      current.filter((url) => url !== stored && portfolioPathFromUrl(url) !== portfolioPathFromUrl(stored)),
    );
  } catch (error) {
    throw error instanceof Error ? error : new Error("Bild konnte nicht gelöscht werden.");
  }

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?portfolio=1");
}
