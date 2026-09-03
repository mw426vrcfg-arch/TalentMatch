import { createAdminClient } from "@/lib/supabase/admin";
import { insertFlexible, isMissingRelation } from "@/lib/supabase/flexible-write";

export type DisputeRow = {
  id: string;
  description: string;
  created_at: string;
};

type Admin = ReturnType<typeof createAdminClient>;

export async function resolveDisputeBookingId(
  admin: Admin,
  applicationId: string,
  bookingId?: string | null,
) {
  if (bookingId) {
    return bookingId;
  }
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("application_id", applicationId)
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function createDispute(
  admin: Admin,
  input: {
    reporterId: string;
    reportedUserId: string;
    applicationId: string;
    bookingId: string | null;
    description: string;
  },
) {
  const bookingId = await resolveDisputeBookingId(admin, input.applicationId, input.bookingId);
  const threadIds = [...new Set([bookingId, input.applicationId].filter((value): value is string => Boolean(value)))];
  if (threadIds.length === 0) {
    throw new Error("Kein bestätigter Termin zum Melden gefunden.");
  }

  let lastError = "Meldung konnte nicht gespeichert werden.";
  for (const threadId of threadIds) {
    try {
      await insertFlexible(admin, "disputes", {
        reporter_id: input.reporterId,
        reported_user_id: input.reportedUserId,
        application_id: input.applicationId,
        booking_id: threadId,
        description: input.description,
        status: "open",
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isMissingRelation(message)) {
        throw new Error("Die Melde-Tabelle ist noch nicht eingerichtet.");
      }
      lastError = message || lastError;
    }
  }

  throw new Error(lastError);
}
