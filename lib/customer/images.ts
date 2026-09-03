import {
  fileExtension,
  isImageFile,
  MAX_LOGO_BYTES,
} from "@/lib/business/images";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

export const CUSTOMER_IMAGES_BUCKET = "customer-images";
export const MAX_AVATAR_BYTES = MAX_LOGO_BYTES;

export { isImageFile, fileExtension };

async function fileToUploadBody(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

export async function ensureCustomerImagesBucket(
  admin: ReturnType<typeof createAdminClient>,
) {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === CUSTOMER_IMAGES_BUCKET);

  if (!exists) {
    const { error } = await admin.storage.createBucket(CUSTOMER_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: MAX_AVATAR_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(error.message);
    }
  }

  return CUSTOMER_IMAGES_BUCKET;
}

export function resolveAvatarUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value.split("?")[0];
  }

  const path = value.replace(/^\/+/, "");
  return `${getSupabaseUrl()}/storage/v1/object/public/${CUSTOMER_IMAGES_BUCKET}/${path}`;
}

export async function uploadCustomerAvatar(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  file: File,
) {
  const bucket = await ensureCustomerImagesBucket(admin);
  const folder = userId;
  const path = `${folder}/avatar.${fileExtension(file)}`;
  const body = await fileToUploadBody(file);

  const { data: existing } = await admin.storage.from(bucket).list(folder);
  const stale = (existing ?? [])
    .filter((item) => item.name.startsWith("avatar."))
    .map((item) => `${folder}/${item.name}`)
    .filter((name) => name !== path);

  if (stale.length > 0) {
    await admin.storage.from(bucket).remove(stale);
  }

  const { error } = await admin.storage.from(bucket).upload(path, body, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl?.split("?")[0];
  if (!publicUrl) {
    throw new Error("Öffentliche Bild-URL konnte nicht erzeugt werden.");
  }
  return publicUrl;
}
