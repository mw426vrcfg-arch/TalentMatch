import { createAdminClient } from "@/lib/supabase/admin";

export const APPLICATION_IMAGES_BUCKET = "application-images";

export function applicationImagePath(stored: string) {
  const marker = `/${APPLICATION_IMAGES_BUCKET}/`;
  const fromPublic = stored.split(marker)[1];
  const raw = fromPublic ?? stored;
  return decodeURIComponent(raw.split("?")[0]);
}

export async function signApplicationImages(stored: string[]) {
  const admin = createAdminClient();

  const signed = await Promise.all(
    stored.map(async (value) => {
      const path = applicationImagePath(value);
      const { data, error } = await admin.storage
        .from(APPLICATION_IMAGES_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        return value;
      }

      return data.signedUrl;
    }),
  );

  return signed;
}
