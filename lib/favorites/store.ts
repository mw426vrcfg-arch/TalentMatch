import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { partnerSalonLabel, regionLabel } from "@/lib/offers/anonymize";
import { loadOffersByIds, type BrowseOffer } from "@/lib/offers/load-active-offers";

type FavoritesDb = ReturnType<typeof createAdminClient>;

export type FollowedSalonCard = {
  salon_id: string;
  partner_name: string;
  region: string;
};

async function actorUserId(fallback: string) {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user?.id ?? fallback;
}

async function withFavoritesDb<T>(
  userId: string,
  run: (db: FavoritesDb, actorId: string) => Promise<T>,
): Promise<T> {
  const actorId = await actorUserId(userId);
  const session = await createClient();
  const clients: FavoritesDb[] = [session as unknown as FavoritesDb, createAdminClient()];

  let lastError: Error | null = null;
  for (const db of clients) {
    try {
      return await run(db, actorId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Favoriten fehlgeschlagen.");
    }
  }

  throw lastError ?? new Error("Favoriten fehlgeschlagen.");
}

function throwIfError(error: { message: string; code?: string } | null, fallback: string) {
  if (!error) {
    return;
  }
  throw new Error(error.message || fallback);
}

export async function loadFavoriteOfferIds(userId: string) {
  const rows = await loadFavoriteRows(userId);
  return [...new Set(rows.map((row) => row.offer_id))];
}

async function loadFavoriteRows(userId: string) {
  const actorId = await actorUserId(userId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("favorite_offers")
    .select("offer_id, created_at")
    .eq("user_id", actorId)
    .order("created_at", { ascending: false });

  throwIfError(error, "Favoriten konnten nicht geladen werden.");
  return (data ?? []).map((row) => ({
    offer_id: String(row.offer_id),
    created_at: String(row.created_at ?? ""),
  }));
}

export async function loadFavoriteOffers(userId: string): Promise<BrowseOffer[]> {
  const rows = await loadFavoriteRows(userId);
  const offers = await loadOffersByIds(rows.map((row) => row.offer_id));
  return offers;
}

export async function loadFollowedSalonIds(userId: string) {
  const rows = await loadFollowRows(userId);
  return [...new Set(rows.map((row) => row.salon_id))];
}

async function loadFollowRows(userId: string) {
  const actorId = await actorUserId(userId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("followed_salons")
    .select("salon_id, created_at")
    .eq("user_id", actorId)
    .order("created_at", { ascending: false });

  throwIfError(error, "Abonnements konnten nicht geladen werden.");
  return (data ?? []).map((row) => ({
    salon_id: String(row.salon_id),
    created_at: String(row.created_at ?? ""),
  }));
}

export async function toggleFavoriteOffer(userId: string, offerId: string) {
  return withFavoritesDb(userId, async (db, actorId) => {
    const { data: existing, error: loadError } = await db
      .from("favorite_offers")
      .select("id")
      .eq("user_id", actorId)
      .eq("offer_id", offerId)
      .maybeSingle();

    throwIfError(loadError, "Favorit konnte nicht geprüft werden.");

    if (existing?.id) {
      const { error } = await db.from("favorite_offers").delete().eq("id", existing.id).eq("user_id", actorId);
      throwIfError(error, "Favorit konnte nicht entfernt werden.");
      return false;
    }

    const { error } = await db.from("favorite_offers").insert({
      user_id: actorId,
      offer_id: offerId,
    });

    if (error && error.code === "23505") {
      return true;
    }
    throwIfError(error, "Favorit konnte nicht gespeichert werden.");
    return true;
  });
}

export async function resolveSalonProfileId(salonId: string) {
  const admin = createAdminClient();
  const byId = await admin.from("business_profiles").select("id").eq("id", salonId).maybeSingle();
  if (byId.data?.id) {
    return String(byId.data.id);
  }

  const byUser = await admin.from("business_profiles").select("id").eq("user_id", salonId).maybeSingle();
  if (byUser.data?.id) {
    return String(byUser.data.id);
  }

  throw new Error("Salon nicht gefunden.");
}

export async function toggleFollowSalon(userId: string, salonId: string) {
  const profileId = await resolveSalonProfileId(salonId);

  return withFavoritesDb(userId, async (db, actorId) => {
    const { data: existing, error: loadError } = await db
      .from("followed_salons")
      .select("id")
      .eq("user_id", actorId)
      .eq("salon_id", profileId)
      .maybeSingle();

    throwIfError(loadError, "Abo konnte nicht geprüft werden.");

    if (existing?.id) {
      const { error } = await db.from("followed_salons").delete().eq("id", existing.id).eq("user_id", actorId);
      throwIfError(error, "Abo konnte nicht entfernt werden.");
      return false;
    }

    const { error } = await db.from("followed_salons").insert({
      user_id: actorId,
      salon_id: profileId,
    });

    if (error && error.code === "23505") {
      return true;
    }
    throwIfError(error, "Salon konnte nicht abonniert werden.");
    return true;
  });
}

export async function loadFollowedSalonCards(userId: string): Promise<FollowedSalonCard[]> {
  const rows = await loadFollowRows(userId);
  const salonIds = rows.map((row) => row.salon_id);
  if (salonIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin.from("business_profiles").select("id, user_id, location").in("id", salonIds);
  const byId = new Map(
    (data ?? []).map((row) => {
      const id = String(row.id);
      const city = String(row.location ?? "").trim();
      return [
        id,
        {
          salon_id: id,
          partner_name: partnerSalonLabel(id || String(row.user_id ?? id)),
          region: regionLabel(city),
        } satisfies FollowedSalonCard,
      ];
    }),
  );

  return salonIds.map((id) => byId.get(id)).filter((salon): salon is FollowedSalonCard => Boolean(salon));
}

export async function loadFollowerUserIds(admin: ReturnType<typeof createAdminClient>, salonId: string) {
  const profileId = await resolveSalonProfileId(salonId).catch(() => salonId);
  const { data, error } = await admin.from("followed_salons").select("user_id").eq("salon_id", profileId);

  if (error) {
    console.error("Followers load failed:", error.message);
    return [] as string[];
  }

  return [...new Set((data ?? []).map((row) => String(row.user_id)))];
}
