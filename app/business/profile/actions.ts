"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/require-business";
import {
  isImageFile,
  MAX_LOGO_BYTES,
  resolveLogoUrl,
  uploadSalonLogo,
} from "@/lib/business/images";
import { loadBusinessProfileByUserId, saveBusinessProfile } from "@/lib/business/profile-store";
import { asGenderOrNull } from "@/lib/profile/gender";
import { readLine, readText, sanitizePhone, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileFormState = {
  error?: string;
};

export async function loadMyBusinessProfileAction() {
  const { user } = await requireBusiness();
  const admin = createAdminClient();
  const { profile } = await loadBusinessProfileByUserId(admin, user.id);
  if (!profile) {
    return null;
  }
  return {
    ...profile,
    logo_url: resolveLogoUrl(profile.logo_url),
  };
}

export async function updateBusinessProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user, business } = await requireBusiness();

  const businessName = readLine(formData, "business_name", TEXT_LIMITS.name);
  const location = readLine(formData, "location", TEXT_LIMITS.location);
  const address =
    readLine(formData, "address", TEXT_LIMITS.address) ||
    readLine(formData, "street", TEXT_LIMITS.address);
  const phone = sanitizePhone(formData.get("phone"));
  const gender = asGenderOrNull(formData.get("gender"));
  const description = readText(formData, "description", TEXT_LIMITS.description);
  const logo = formData.get("logo");

  if (!businessName || !location) {
    return { error: "Salon-Name und Ort sind Pflichtfelder." };
  }

  let logoUrl = business?.logo_url ?? null;
  const admin = createAdminClient();
  let profileId = business?.id;

  if (logo instanceof File && logo.size > 0) {
    if (!isImageFile(logo)) {
      return { error: "Das Logo muss eine Bilddatei sein (JPG, PNG oder WebP)." };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { error: "Das Logo darf höchstens 2 MB groß sein." };
    }

    if (!profileId) {
      try {
        const created = await saveBusinessProfile(admin, {
          userId: user.id,
          business_name: businessName,
          location,
          description: description || null,
          address: address || null,
          phone: phone || null,
          logo_url: null,
          gender,
        });
        profileId = created?.id;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Profil konnte nicht angelegt werden.",
        };
      }
    }

    if (!profileId) {
      return { error: "Kein Salonprofil gefunden." };
    }

    try {
      logoUrl = await uploadSalonLogo(admin, profileId, logo);
    } catch (uploadError) {
      return {
        error:
          uploadError instanceof Error
            ? `Logo-Upload fehlgeschlagen: ${uploadError.message}`
            : "Logo-Upload fehlgeschlagen.",
      };
    }
  }

  try {
    await saveBusinessProfile(admin, {
      userId: user.id,
      profileId,
      business_name: businessName,
      location,
      description: description || null,
      address: address || null,
      phone: phone || null,
      logo_url: logoUrl,
      gender,
    });

    if (logoUrl) {
      const targetId = profileId ?? user.id;
      for (const column of ["logo_url", "profile_picture_url"] as const) {
        const { error: logoError } = await admin
          .from("business_profiles")
          .update({ [column]: logoUrl })
          .eq("id", targetId);
        if (logoError && !/could not find the '|schema cache/i.test(logoError.message)) {
          throw new Error(logoError.message);
        }
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.",
    };
  }

  revalidatePath("/business/profile");
  revalidatePath("/business/dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/offers");
  redirect("/business/profile?saved=1");
}
