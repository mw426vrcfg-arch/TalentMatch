import {
  CUSTOMER_IMAGES_BUCKET,
  ensureCustomerImagesBucket,
  fileExtension,
  isImageFile,
  MAX_AVATAR_BYTES,
  resolveAvatarUrl,
} from "@/lib/customer/images";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_PORTFOLIO_IMAGES = 6;
export const PORTFOLIO_FOLDER = "portfolio";
export const MAX_PORTFOLIO_BYTES = MAX_AVATAR_BYTES;

const PORTFOLIO_COLUMNS = [
  "hair_portfolio",
  "portfolio_images",
  "gallery_urls",
  "portfolio_urls",
] as const;

type Admin = ReturnType<typeof createAdminClient>;

export { isImageFile };

export function parsePortfolio(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqueUrls(value.map((item) => String(item ?? "").trim()).filter(Boolean));
  }

  if (typeof value === "object") {
    return parsePortfolio(Object.values(value as Record<string, unknown>));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      return parsePortfolio(JSON.parse(trimmed));
    } catch {
      return uniqueUrls(
        trimmed
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
  }

  return [];
}

function uniqueUrls(urls: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    const url = resolveAvatarUrl(raw) ?? raw;
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    result.push(url);
    if (result.length >= MAX_PORTFOLIO_IMAGES) {
      break;
    }
  }
  return result;
}

export function portfolioFromProfileRow(row: Record<string, unknown> | null | undefined) {
  if (!row) {
    return [];
  }

  const collected: string[] = [];
  for (const column of PORTFOLIO_COLUMNS) {
    if (column in row) {
      collected.push(...parsePortfolio(row[column]));
    }
  }

  for (let index = 1; index <= MAX_PORTFOLIO_IMAGES; index += 1) {
    for (const prefix of ["hair_photo", "portfolio", "photo", "image"]) {
      const key = `${prefix}_${index}`;
      if (key in row) {
        collected.push(...parsePortfolio(row[key]));
      }
    }
  }

  return uniqueUrls(collected);
}

function portfolioObjectPath(userId: string, fileName: string) {
  return `${userId}/${PORTFOLIO_FOLDER}/${fileName}`;
}

export function portfolioPathFromUrl(value: string) {
  const marker = `/${CUSTOMER_IMAGES_BUCKET}/`;
  const fromPublic = value.split(marker)[1];
  return decodeURIComponent((fromPublic ?? value).split("?")[0].replace(/^\/+/, ""));
}

export async function listPortfolioFromStorage(admin: Admin, userId: string) {
  const bucket = await ensureCustomerImagesBucket(admin);
  const urls: string[] = [];

  async function collect(folder: string, pathFor: (name: string) => string) {
    const { data, error } = await admin.storage.from(bucket).list(folder, {
      limit: 20,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      return;
    }
    for (const item of data ?? []) {
      if (!item.name || item.name.endsWith("/") || item.name.startsWith("avatar.")) {
        continue;
      }
      if (!/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(item.name) && folder === userId) {
        continue;
      }
      const { data: publicData } = admin.storage.from(bucket).getPublicUrl(pathFor(item.name));
      const url = publicData.publicUrl?.split("?")[0];
      if (url) {
        urls.push(url);
      }
    }
  }

  await collect(`${userId}/${PORTFOLIO_FOLDER}`, (name) => portfolioObjectPath(userId, name));
  await collect(userId, (name) => `${userId}/${name}`);

  return uniqueUrls(urls);
}

export async function loadHairPortfolio(admin: Admin, userId: string, row?: Record<string, unknown> | null) {
  const fromDb = portfolioFromProfileRow(row);
  const fromStorage = await listPortfolioFromStorage(admin, userId);
  return uniqueUrls([...fromDb, ...fromStorage]);
}

export async function persistHairPortfolio(admin: Admin, userId: string, urls: string[]) {
  const capped = uniqueUrls(urls);
  const attempts: Record<string, unknown>[] = [
    { portfolio_images: capped },
    { hair_portfolio: capped },
    { hair_portfolio: JSON.stringify(capped) },
    { gallery_urls: capped },
    { portfolio_urls: capped },
  ];

  for (const payload of attempts) {
    const byUser = await admin.from("customer_profiles").update(payload).eq("user_id", userId);
    if (!byUser.error) {
      return { urls: capped, persisted: true };
    }
    if (/could not find the '|does not exist|schema cache|invalid input/i.test(byUser.error.message)) {
      continue;
    }
    const byId = await admin.from("customer_profiles").update(payload).eq("id", userId);
    if (!byId.error) {
      return { urls: capped, persisted: true };
    }
    if (!/could not find the '|does not exist|schema cache|invalid input/i.test(byId.error.message)) {
      throw new Error(byId.error.message);
    }
  }

  // Keine der Spalten existiert. Die Bilder liegen im Storage und werden von
  // loadHairPortfolio weiterhin gefunden, aber die Zuordnung fehlt in der DB.
  return { urls: capped, persisted: false };
}

export async function uploadPortfolioImage(admin: Admin, userId: string, file: File) {
  const bucket = await ensureCustomerImagesBucket(admin);
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const path = portfolioObjectPath(userId, `${stamp}.${fileExtension(file)}`);
  const body = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage.from(bucket).upload(path, body, {
    contentType: file.type || "image/jpeg",
    upsert: false,
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

export async function removePortfolioImage(admin: Admin, userId: string, stored: string) {
  const path = portfolioPathFromUrl(stored);
  if (!path.startsWith(`${userId}/`)) {
    throw new Error("Dieses Bild gehört nicht zu deinem Portfolio.");
  }

  const { error } = await admin.storage.from(CUSTOMER_IMAGES_BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}
