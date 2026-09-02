"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/require-business";
import {
  isImageFile,
  MAX_LOGO_BYTES,
  uploadSalonLogo,
} from "@/lib/business/images";
import { saveBusinessProfile } from "@/lib/business/profile-store";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileFormState = {
  error?: string;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateBusinessProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user, business } = await requireBusiness();

  const businessName = readString(formData, "business_name");
  const location = readString(formData, "location");
  const address = readString(formData, "address");
  const phone = readString(formData, "phone");
  const description = readString(formData, "description");
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
    });
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
