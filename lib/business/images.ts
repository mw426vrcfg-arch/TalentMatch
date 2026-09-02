import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

export const BUSINESS_IMAGES_BUCKET = "business-images";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) {
    return fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

async function fileToUploadBody(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return bytes;
}

export async function ensureBusinessImagesBucket(
  admin: ReturnType<typeof createAdminClient>,
) {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === BUSINESS_IMAGES_BUCKET);

  if (!exists) {
    const { error } = await admin.storage.createBucket(BUSINESS_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: MAX_LOGO_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(error.message);
    }
  }

  return BUSINESS_IMAGES_BUCKET;
}

export function resolveLogoUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const path = value.replace(/^\/+/, "");
  return `${getSupabaseUrl()}/storage/v1/object/public/${BUSINESS_IMAGES_BUCKET}/${path}`;
}

export async function uploadSalonLogo(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  file: File,
) {
  const bucket = await ensureBusinessImagesBucket(admin);
  const folder = businessId;
  const path = `${folder}/logo.${fileExtension(file)}`;
  const body = await fileToUploadBody(file);

  const { data: existing } = await admin.storage.from(bucket).list(folder);
  const stale = (existing ?? [])
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
  return `${data.publicUrl}?v=${Date.now()}`;
}
