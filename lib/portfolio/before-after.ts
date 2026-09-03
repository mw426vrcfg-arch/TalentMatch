import {
  BUSINESS_IMAGES_BUCKET,
  ensureBusinessImagesBucket,
  fileExtension,
  isImageFile,
  MAX_LOGO_BYTES,
} from "@/lib/business/images";
import { createAdminClient } from "@/lib/supabase/admin";

export type BeforeAfterPair = {
  id: string;
  before_url: string;
  after_url: string;
};

type Admin = ReturnType<typeof createAdminClient>;

async function fileToBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

export async function uploadBeforeAfterImage(
  admin: Admin,
  salonUserId: string,
  kind: "before" | "after",
  file: File,
) {
  if (!isImageFile(file)) {
    throw new Error("Bitte ein Bild (JPG, PNG oder WebP) wählen.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Jedes Bild darf höchstens 2 MB groß sein.");
  }

  const bucket = await ensureBusinessImagesBucket(admin);
  const stamp = `${Date.now()}-${kind}.${fileExtension(file)}`;
  const path = `${salonUserId}/portfolio/${stamp}`;
  const { error } = await admin.storage.from(bucket).upload(path, await fileToBytes(file), {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) {
    throw new Error(error.message);
  }
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  const url = data.publicUrl?.split("?")[0];
  if (!url) {
    throw new Error("Bild-URL konnte nicht erzeugt werden.");
  }
  return url;
}

export async function savePortfolioPair(
  admin: Admin,
  input: {
    ratingId: string | null;
    salonUserId: string;
    beforeUrl: string;
    afterUrl: string;
  },
) {
  const row = {
    rating_id: input.ratingId,
    salon_user_id: input.salonUserId,
    before_url: input.beforeUrl,
    after_url: input.afterUrl,
  };

  const { error } = await admin.from("portfolio_images").insert(row);
  if (!error) {
    return;
  }

  if (input.ratingId) {
    await admin
      .from("ratings")
      .update({ before_url: input.beforeUrl, after_url: input.afterUrl })
      .eq("id", input.ratingId);
  }

  if (!/does not exist|schema cache/i.test(error.message)) {
    console.error("Portfolio save failed:", error.message);
  }
}

export async function loadSalonBeforeAfter(salonUserId: string): Promise<BeforeAfterPair[]> {
  const admin = createAdminClient();
  const fromTable = await admin
    .from("portfolio_images")
    .select("id, before_url, after_url, created_at")
    .eq("salon_user_id", salonUserId)
    .order("created_at", { ascending: false });

  if (!fromTable.error) {
    return (fromTable.data ?? [])
      .map((row) => ({
        id: String(row.id),
        before_url: String(row.before_url ?? ""),
        after_url: String(row.after_url ?? ""),
      }))
      .filter((row) => row.before_url && row.after_url);
  }

  const fromRatings = await admin
    .from("ratings")
    .select("id, before_url, after_url, created_at")
    .eq("from_user_id", salonUserId)
    .not("before_url", "is", null)
    .order("created_at", { ascending: false });

  if (fromRatings.error) {
    return [];
  }

  return (fromRatings.data ?? [])
    .map((row) => ({
      id: String(row.id),
      before_url: String(row.before_url ?? ""),
      after_url: String(row.after_url ?? ""),
    }))
    .filter((row) => row.before_url && row.after_url);
}

export { BUSINESS_IMAGES_BUCKET };
