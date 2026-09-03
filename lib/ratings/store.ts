import { createAdminClient } from "@/lib/supabase/admin";

export type PendingRating = {
  booking_id: string;
  application_id: string;
  booking_row_id: string;
  reviewee_id: string;
  counterpart_name: string;
  offer_title: string;
  start_time: string;
};

export type RatingAverage = {
  average: number | null;
  count: number;
};

export type ReceivedReview = {
  id: string;
  from_user_id: string;
  from_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function formatSalonAverage(value: RatingAverage) {
  if (!value.count || value.average == null) {
    return null;
  }
  return value.average.toFixed(1);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STALE_RATING_MESSAGE =
  "Dieser Test-Termin ist nicht mehr gültig. Schließe einen aktuellen Termin ab und bewerte danach erneut.";

function isUuid(value: string) {
  return UUID.test(value);
}

function isForeignKeyError(message: string) {
  return /foreign key constraint|ratings_booking_id_fkey/i.test(message);
}

function isMissingRatings(message: string) {
  return /ratings/i.test(message) && /does not exist|schema cache|from_user_id|reviewer_id/i.test(message);
}

const RATING_SELECT = "id, booking_id, from_user_id, reviewee_id, rating, comment, created_at";

export async function loadRatingAverages(userIds: string[]) {
  const empty = new Map<string, RatingAverage>();
  if (userIds.length === 0) {
    return empty;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ratings")
      .select("reviewee_id, rating")
      .in("reviewee_id", userIds);

    if (error) {
      if (!isMissingRatings(error.message)) {
        console.error("Ratings load failed:", error.message);
      }
      return empty;
    }

    const sums = new Map<string, { total: number; count: number }>();
    for (const row of data ?? []) {
      const id = String(row.reviewee_id);
      const current = sums.get(id) ?? { total: 0, count: 0 };
      current.total += Number(row.rating);
      current.count += 1;
      sums.set(id, current);
    }

    const result = new Map<string, RatingAverage>();
    for (const id of userIds) {
      const entry = sums.get(id);
      result.set(
        id,
        entry && entry.count > 0
          ? { average: entry.total / entry.count, count: entry.count }
          : { average: null, count: 0 },
      );
    }
    return result;
  } catch (error) {
    console.error("Ratings load failed:", error instanceof Error ? error.message : error);
    return empty;
  }
}

export const loadSalonAverages = loadRatingAverages;

export async function loadReceivedReviews(revieweeId: string): Promise<ReceivedReview[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ratings")
      .select(RATING_SELECT)
      .eq("reviewee_id", revieweeId)
      .order("created_at", { ascending: false });

    if (error) {
      if (!isMissingRatings(error.message)) {
        console.error("Ratings load failed:", error.message);
      }
      return [];
    }

    const rows = data ?? [];
    const fromIds = [...new Set(rows.map((row) => String(row.from_user_id)))];
    const { data: users } = fromIds.length
      ? await admin.from("users").select("id, full_name").in("id", fromIds)
      : { data: [] as { id: string; full_name: string }[] };
    const names = new Map((users ?? []).map((user) => [user.id as string, user.full_name as string]));

    return rows.map((row) => ({
      id: String(row.id),
      from_user_id: String(row.from_user_id),
      from_name: names.get(String(row.from_user_id)) || "Nutzer",
      rating: Number(row.rating),
      comment: (row.comment as string | null)?.trim() || null,
      created_at: String(row.created_at),
    }));
  } catch (error) {
    console.error("Ratings load failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function hasRatedBooking(candidates: string[], fromUserId: string) {
  const ids = [...new Set(candidates.filter(isUuid))];
  if (ids.length === 0) {
    return false;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ratings")
      .select("id")
      .eq("from_user_id", fromUserId)
      .in("booking_id", ids)
      .maybeSingle();

    if (error) {
      return false;
    }
    return Boolean(data);
  } catch {
    return false;
  }
}

type BookingParty = {
  booking_id: string;
  booking_status: string;
  application_id: string;
  slot_id: string;
  customer_id: string;
  salon_user_id: string;
  offer_title: string;
  start_time: string;
  customer_name: string;
  salon_name: string;
};

async function loadCompletedParties(filter: {
  customerId?: string;
  salonUserId?: string;
}): Promise<BookingParty[]> {
  const admin = createAdminClient();
  const { data: bookings, error } = await admin
    .from("bookings")
    .select("id, application_id, slot_id, booking_status")
    .eq("booking_status", "completed");

  if (error) {
    throw new Error(error.message);
  }

  const bookingRows = bookings ?? [];
  if (bookingRows.length === 0) {
    return [];
  }

  const applicationIds = bookingRows.map((row) => row.application_id as string);
  const { data: applications } = await admin
    .from("applications")
    .select("id, customer_id, offer_id")
    .in("id", applicationIds);

  const applicationRows = applications ?? [];
  const offerIds = [...new Set(applicationRows.map((row) => row.offer_id as string))];
  const { data: offers } = await admin
    .from("offers")
    .select("id, title, business_id")
    .in("id", offerIds);

  const offerRows = offers ?? [];
  const businessIds = [...new Set(offerRows.map((row) => row.business_id as string))];
  const { data: businesses } = await admin
    .from("business_profiles")
    .select("id, user_id, business_name")
    .in("id", businessIds);

  const slotIds = bookingRows.map((row) => row.slot_id as string);
  const customerIds = [...new Set(applicationRows.map((row) => row.customer_id as string))];
  const [{ data: slots }, { data: users }] = await Promise.all([
    slotIds.length
      ? admin.from("offer_slots").select("id, start_time").in("id", slotIds)
      : Promise.resolve({ data: [] as { id: string; start_time: string }[] }),
    customerIds.length
      ? admin.from("users").select("id, full_name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const applicationMap = new Map(applicationRows.map((row) => [row.id as string, row]));
  const offerMap = new Map(offerRows.map((row) => [row.id as string, row]));
  const businessMap = new Map((businesses ?? []).map((row) => [row.id as string, row]));
  const slotMap = new Map((slots ?? []).map((row) => [row.id as string, row.start_time as string]));
  const userMap = new Map((users ?? []).map((row) => [row.id as string, row.full_name as string]));

  return bookingRows
    .map((booking) => {
      const application = applicationMap.get(booking.application_id as string);
      if (!application) {
        return null;
      }
      const offer = offerMap.get(application.offer_id as string);
      if (!offer) {
        return null;
      }
      const business = businessMap.get(offer.business_id as string);
      if (!business) {
        return null;
      }

      const party: BookingParty = {
        booking_id: booking.id as string,
        booking_status: booking.booking_status as string,
        application_id: application.id as string,
        slot_id: booking.slot_id as string,
        customer_id: application.customer_id as string,
        salon_user_id: business.user_id as string,
        offer_title: (offer.title as string) || "Angebot",
        start_time: slotMap.get(booking.slot_id as string) ?? new Date().toISOString(),
        customer_name: userMap.get(application.customer_id as string) || "Kunde",
        salon_name: (business.business_name as string) || "Salon",
      };

      if (filter.customerId && party.customer_id !== filter.customerId) {
        return null;
      }
      if (filter.salonUserId && party.salon_user_id !== filter.salonUserId) {
        return null;
      }
      return party;
    })
    .filter((row): row is BookingParty => row !== null);
}

export async function loadPendingRatingsForUser(input: {
  userId: string;
  role: "customer" | "business";
}): Promise<PendingRating[]> {
  try {
    const parties = await loadCompletedParties(
      input.role === "customer" ? { customerId: input.userId } : { salonUserId: input.userId },
    );
    if (parties.length === 0) {
      return [];
    }

    const admin = createAdminClient();
    const { data: existing, error } = await admin
      .from("ratings")
      .select("booking_id")
      .eq("from_user_id", input.userId)
      .in(
        "booking_id",
        parties.flatMap((party) => [party.application_id, party.booking_id]),
      );

    if (error && !isMissingRatings(error.message)) {
      console.error("Ratings load failed:", error.message);
    }

    const rated = new Set((existing ?? []).map((row) => String(row.booking_id)));

    return parties
      .filter(
        (party) => !rated.has(party.booking_id) && !rated.has(party.application_id),
      )
      .map((party) => ({
        booking_id: party.application_id,
        application_id: party.application_id,
        booking_row_id: party.booking_id,
        reviewee_id: input.role === "customer" ? party.salon_user_id : party.customer_id,
        counterpart_name: input.role === "customer" ? party.salon_name : party.customer_name,
        offer_title: party.offer_title,
        start_time: party.start_time,
      }));
  } catch (error) {
    console.error("Ratings load failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function submitRating(input: {
  fromUserId: string;
  bookingId: string;
  applicationId?: string;
  bookingRowId?: string;
  revieweeId?: string;
  rating: number;
  comment: string;
}) {
  const admin = createAdminClient();
  const parties = await loadCompletedParties({});
  const party = parties.find(
    (item) =>
      item.application_id === input.bookingId ||
      item.booking_id === input.bookingId ||
      item.application_id === input.applicationId ||
      item.booking_id === input.bookingRowId,
  );

  if (!party) {
    throw new Error(STALE_RATING_MESSAGE);
  }

  const isCustomer = party.customer_id === input.fromUserId;
  const isSalon = party.salon_user_id === input.fromUserId;
  if (!isCustomer && !isSalon) {
    throw new Error("Dieser Termin gehört nicht zu deinem Konto.");
  }

  const revieweeId = isCustomer ? party.salon_user_id : party.customer_id;
  if (input.revieweeId && input.revieweeId !== revieweeId) {
    throw new Error("Die Bewertung kann nicht gespeichert werden.");
  }

  if (!revieweeId) {
    throw new Error("reviewee_id fehlt — Bewertung kann nicht gespeichert werden.");
  }

  const candidates = [
    party.application_id,
    party.booking_id,
    input.applicationId,
    input.bookingId,
    input.bookingRowId,
  ].filter((value): value is string => typeof value === "string" && isUuid(value));

  const already = await hasRatedBooking(candidates, input.fromUserId);
  if (already) {
    throw new Error("Du hast diesen Termin bereits bewertet.");
  }

  const { data: application } = await admin
    .from("applications")
    .select("id")
    .eq("id", party.application_id)
    .maybeSingle();
  const { data: booking } = await admin
    .from("bookings")
    .select("id")
    .eq("id", party.booking_id)
    .maybeSingle();

  const insertIds = [
    application?.id as string | undefined,
    booking?.id as string | undefined,
  ].filter((value): value is string => Boolean(value));

  if (insertIds.length === 0) {
    throw new Error(STALE_RATING_MESSAGE);
  }

  let lastError = STALE_RATING_MESSAGE;
  let savedRatingId: string | null = null;
  for (const bookingId of insertIds) {
    const { data, error } = await admin.from("ratings").insert({
      booking_id: bookingId,
      from_user_id: input.fromUserId,
      reviewee_id: revieweeId,
      rating: input.rating,
      comment: input.comment.trim(),
    }).select("id").single();

    if (!error && data?.id) {
      savedRatingId = String(data.id);
      break;
    }

    lastError = error?.message ?? lastError;
    if (error && !isForeignKeyError(error.message)) {
      throw new Error(error.message);
    }
  }

  if (!savedRatingId) {
    throw new Error(isForeignKeyError(lastError) ? STALE_RATING_MESSAGE : lastError);
  }

  return { ratingId: savedRatingId, salonUserId: party.salon_user_id, customerId: party.customer_id, isSalon };
}
