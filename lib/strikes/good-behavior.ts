import { parseSlotIdFromNotes, parseSlotStartFromNotes } from "@/lib/applications/slot-from-notes";
import { notifyAccountReactivated } from "@/lib/strikes/reactivate";
import { unbanCustomerLogin } from "@/lib/strikes/expire";
import { createAdminClient } from "@/lib/supabase/admin";

const GOOD_RATING = 4;

type TimelineEvent = {
  start: number;
  status: string;
  bookingIds: string[];
  salonRating: number | null;
};

function isMissingColumnError(message: string) {
  return /could not find the '|schema cache|does not exist/i.test(message);
}

export async function applyGoodBehaviorReset(customerId: string) {
  const admin = createAdminClient();
  const { data: strikes, error: strikeError } = await admin
    .from("strikes")
    .select("id, created_at")
    .eq("customer_id", customerId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (strikeError) {
    console.error("Good-behavior strikes load failed:", strikeError.message);
    return { reset: false };
  }

  const active = strikes ?? [];
  if (active.length === 0) {
    return { reset: false };
  }

  let user: { account_status?: string | null; good_behavior_reset_at?: string | null } | null = null;
  const withReset = await admin
    .from("users")
    .select("id, account_status, good_behavior_reset_at")
    .eq("id", customerId)
    .maybeSingle();
  if (withReset.error && isMissingColumnError(withReset.error.message)) {
    const fallback = await admin
      .from("users")
      .select("id, account_status")
      .eq("id", customerId)
      .maybeSingle();
    user = fallback.data;
  } else {
    user = withReset.data;
  }

  const lastReset = user?.good_behavior_reset_at
    ? new Date(String(user.good_behavior_reset_at)).getTime()
    : 0;
  const latestStrike = new Date(String(active[active.length - 1]?.created_at)).getTime();
  const baseline = Math.max(lastReset, Number.isFinite(latestStrike) ? latestStrike : 0);

  const { data: applications } = await admin
    .from("applications")
    .select("id, notes, status")
    .eq("customer_id", customerId);

  const applicationRows = applications ?? [];
  if (applicationRows.length === 0) {
    return { reset: false };
  }

  const applicationIds = applicationRows.map((row) => String(row.id));
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, application_id, slot_id, booking_status")
    .in("application_id", applicationIds);

  const bookingRows = bookings ?? [];
  const slotIds = [
    ...new Set(
      [
        ...bookingRows.map((row) => row.slot_id as string | null),
        ...applicationRows.map((row) => parseSlotIdFromNotes(row.notes as string | null)),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
  const { data: slots } = slotIds.length
    ? await admin.from("offer_slots").select("id, start_time").in("id", slotIds)
    : { data: [] as { id: string; start_time: string }[] };
  const slotMap = new Map((slots ?? []).map((slot) => [String(slot.id), String(slot.start_time)]));

  const { data: ratings } = await admin
    .from("ratings")
    .select("booking_id, rating, from_user_id")
    .eq("reviewee_id", customerId);

  const ratingByBooking = new Map<string, number>();
  for (const row of ratings ?? []) {
    if (String(row.from_user_id) === customerId) {
      continue;
    }
    ratingByBooking.set(String(row.booking_id), Number(row.rating));
  }

  const events: TimelineEvent[] = applicationRows.map((application) => {
    const booking = bookingRows.find((row) => String(row.application_id) === String(application.id));
    const slotId =
      (booking?.slot_id as string | null | undefined) || parseSlotIdFromNotes(application.notes as string | null);
    const startIso =
      (slotId ? slotMap.get(slotId) : null) || parseSlotStartFromNotes(application.notes as string | null);
    const status = String(booking?.booking_status ?? application.status ?? "");
    const bookingIds = [booking?.id, application.id].filter(Boolean).map(String);
    const salonRating =
      bookingIds.map((id) => ratingByBooking.get(id)).find((value) => Number.isFinite(value)) ?? null;

    return {
      start: startIso ? new Date(startIso).getTime() : 0,
      status,
      bookingIds,
      salonRating,
    };
  });

  events.sort((a, b) => a.start - b.start);

  let streak = 0;
  for (const event of events) {
    if (!event.start || event.start <= baseline) {
      continue;
    }
    if (event.status === "cancelled") {
      continue;
    }
    if (event.status === "no_show") {
      streak = 0;
      continue;
    }
    if (event.status !== "completed") {
      continue;
    }
    if (event.salonRating == null) {
      break;
    }
    if (event.salonRating < GOOD_RATING) {
      streak = 0;
      continue;
    }
    streak += 1;
    if (streak >= 3) {
      break;
    }
  }

  if (streak < 3) {
    return { reset: false };
  }

  const oldest = active[0];
  const now = new Date().toISOString();
  const previousCount = active.length;
  const withReason = await admin
    .from("strikes")
    .update({ active: false, expired_at: now, cleared_reason: "good_behavior" })
    .eq("id", oldest.id);

  if (withReason.error) {
    if (isMissingColumnError(withReason.error.message)) {
      const fallback = await admin.from("strikes").update({ active: false }).eq("id", oldest.id);
      if (fallback.error) {
        console.error("Good-behavior strike clear failed:", fallback.error.message);
        return { reset: false };
      }
    } else {
      console.error("Good-behavior strike clear failed:", withReason.error.message);
      return { reset: false };
    }
  }

  const resetStamp = await admin
    .from("users")
    .update({ good_behavior_reset_at: now })
    .eq("id", customerId);
  if (resetStamp.error && !isMissingColumnError(resetStamp.error.message)) {
    console.error("Good-behavior reset stamp failed:", resetStamp.error.message);
  }

  if (previousCount >= 3) {
    await unbanCustomerLogin(customerId);
    await notifyAccountReactivated(admin, customerId);
  }

  return { reset: true, previousCount };
}
