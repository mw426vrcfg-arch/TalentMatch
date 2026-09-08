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
import { isLocale } from "@/lib/i18n/config";
import { normalizeThickness } from "@/lib/customer/treatment-pass";
import { loadCustomerProfile, saveCustomerProfile } from "@/lib/customer/profile-store";
import { asGenderOrNull } from "@/lib/profile/gender";
import { persistAuthProfileFields } from "@/lib/profile/persist-auth-fields";
import { withProfileWriter } from "@/lib/profile/with-writer";
import { mirrorToProfilesTable } from "@/lib/profile/write-row";
import { readLine, readText, sanitizeLine, sanitizePhone, TEXT_LIMITS } from "@/lib/security/sanitize";
import { tryCreateAdminClient, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CustomerProfileFormState = {
  error?: string;
  saved?: boolean;
};

function readHairOrKeep(
  formData: FormData,
  key: "hair_structure" | "hair_length" | "hair_chemical",
  kind: "structure" | "length" | "chemical",
  current: string | null | undefined,
) {
  if (!formData.has(key)) {
    return current ?? null;
  }
  return normalizeHairValue(kind, readLine(formData, key, TEXT_LIMITS.shortNote));
}

export async function updateCustomerProfileAction(
  _prev: CustomerProfileFormState,
  formData: FormData,
): Promise<CustomerProfileFormState> {
  const { user } = await requireCustomer();
  const fullName = readLine(formData, "full_name", TEXT_LIMITS.name);
  const bio = readText(formData, "bio", TEXT_LIMITS.bio);
  const phone = sanitizePhone(formData.get("phone"));
  const gender = formData.has("gender")
    ? asGenderOrNull(formData.get("gender"))
    : undefined;
  const languageRaw = readLine(formData, "preferred_language", 8);
  const preferredLanguage = isLocale(languageRaw) ? languageRaw : null;
  const avatar = formData.get("avatar");

  if (!fullName) {
    return { error: "Bitte deinen vollen Namen angeben." };
  }

  const admin = tryCreateAdminClient();
  let avatarUrl: string | null = null;
  let currentHair = { structure: null as string | null, length: null as string | null, chemical: null as string | null };
  let currentPass = {
    last_bleaching: null as string | null,
    chemical_treatments: null as string | null,
    hair_thickness: null as string | null,
  };

  try {
    const loaded = await withProfileWriter((db) =>
      loadCustomerProfile(db, user.id, user.user_metadata as Record<string, unknown>),
    );
    avatarUrl = loaded.profile?.avatar_url ?? null;
    currentHair = loaded.profile?.hair ?? currentHair;
    currentPass = loaded.profile?.treatment_pass ?? currentPass;
  } catch {
    // Speichern legt die Zeile bei Bedarf neu an.
  }

  if (avatar instanceof File && avatar.size > 0) {
    if (!isImageFile(avatar)) {
      return { error: "Das Profilbild muss eine Bilddatei sein (JPG, PNG oder WebP)." };
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { error: "Das Profilbild darf höchstens 2 MB groß sein." };
    }
    if (!admin) {
      return { error: "Bild-Upload ist gerade nicht verfügbar." };
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

  const hair = {
    structure: readHairOrKeep(formData, "hair_structure", "structure", currentHair.structure),
    length: readHairOrKeep(formData, "hair_length", "length", currentHair.length),
    chemical: readHairOrKeep(formData, "hair_chemical", "chemical", currentHair.chemical),
  };

  try {
    await withProfileWriter((db) =>
      saveCustomerProfile(db, {
        userId: user.id,
        full_name: fullName,
        bio: bio || null,
        phone: phone || null,
        avatar_url: avatarUrl,
        gender,
        preferred_language: preferredLanguage,
        hair,
        treatment_pass: {
          last_bleaching: formData.has("last_bleaching")
            ? readLine(formData, "last_bleaching", TEXT_LIMITS.shortNote) || null
            : currentPass.last_bleaching,
          chemical_treatments: formData.has("chemical_treatments")
            ? readText(formData, "chemical_treatments", TEXT_LIMITS.shortNote) || null
            : currentPass.chemical_treatments,
          hair_thickness: formData.has("hair_thickness")
            ? normalizeThickness(readLine(formData, "hair_thickness", TEXT_LIMITS.shortNote))
            : currentPass.hair_thickness,
        },
      }),
    );

    await persistAuthProfileFields({
      full_name: fullName,
      bio: bio || null,
      phone: phone || null,
      gender: gender ?? null,
      preferred_language: preferredLanguage,
      hair_structure: hair.structure,
      hair_length: hair.length,
      hair_chemical: hair.chemical,
    });

    const supabase = await createClient();
    await mirrorToProfilesTable(supabase, user.id, {
      full_name: fullName,
      bio: bio || null,
      phone: phone || null,
      gender: gender ?? null,
      preferred_language: preferredLanguage,
      hair_structure: hair.structure,
      hair_length: hair.length,
      hair_chemical: hair.chemical,
    });

    if (avatarUrl && admin) {
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
  revalidatePath("/offers");
  revalidatePath("/business/dashboard");

  return { saved: true };
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
    return { error: "Dein Haar-Portfolio ist voll (maximal 4 Bilder)." };
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
