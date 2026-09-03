import { sanitizeMultiline, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertFlexible, isMissingRelation } from "@/lib/supabase/flexible-write";

export type ChatMessage = {
  id: string;
  application_id: string;
  booking_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
};

type Admin = ReturnType<typeof createAdminClient>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function mapChatMessage(value: unknown): ChatMessage | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }

  const senderId = firstString(row, ["sender_id", "from_user_id", "user_id"]);
  const body = firstString(row, ["body", "message", "content", "text"]);
  const id = firstString(row, ["id"]);
  if (!id || !senderId || !body) {
    return null;
  }

  return {
    id,
    application_id: firstString(row, ["application_id"]) || "",
    booking_id: firstString(row, ["booking_id"]) || null,
    sender_id: senderId,
    body,
    created_at: firstString(row, ["created_at"]) || new Date().toISOString(),
  };
}

export function isMessagingEnabled(status: string) {
  return (
    status === "accepted" ||
    status === "confirmed" ||
    status === "swap_requested" ||
    status === "completed"
  );
}

export async function resolveBookingIdForApplication(
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

export async function assertChatParticipant(admin: Admin, userId: string, applicationId: string) {
  const { data: application, error } = await admin
    .from("applications")
    .select("id, status, customer_id, offer_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new Error("Termin nicht gefunden.");
  }

  if (!isMessagingEnabled(String(application.status)) && String(application.status) !== "accepted") {
    throw new Error("Nachrichten sind erst nach der Zusage möglich.");
  }

  if (application.customer_id === userId) {
    return application;
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, business_id")
    .eq("id", application.offer_id)
    .maybeSingle();

  if (!offer) {
    throw new Error("Kein Zugang zu diesem Chat.");
  }

  const businessId = offer.business_id as string;
  if (businessId === userId) {
    return application;
  }

  const { data: byId } = await admin
    .from("business_profiles")
    .select("user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (byId?.user_id === userId) {
    return application;
  }

  const { data: byUser } = await admin
    .from("business_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (byUser && (byUser.id === businessId || businessId === userId)) {
    return application;
  }

  throw new Error("Kein Zugang zu diesem Chat.");
}

export async function loadMessagesForApplication(
  admin: Admin,
  applicationId: string,
  bookingId?: string | null,
) {
  const resolvedBookingId = await resolveBookingIdForApplication(admin, applicationId, bookingId);
  const ids = [...new Set([applicationId, resolvedBookingId].filter((value): value is string => Boolean(value)))];

  async function query(column: "booking_id" | "application_id", value: string) {
    return admin
      .from("messages")
      .select("*")
      .eq(column, value)
      .order("created_at", { ascending: true })
      .limit(200);
  }

  const rows: unknown[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    const byBooking = await query("booking_id", id);
    if (!byBooking.error) {
      for (const row of byBooking.data ?? []) {
        const mapped = mapChatMessage(row);
        if (mapped && !seen.has(mapped.id)) {
          seen.add(mapped.id);
          rows.push(row);
        }
      }
      continue;
    }
    if (!isMissingRelation(byBooking.error.message) && !/column/i.test(byBooking.error.message)) {
      throw new Error(byBooking.error.message);
    }
  }

  if (rows.length === 0) {
    const byApplication = await query("application_id", applicationId);
    if (!byApplication.error) {
      for (const row of byApplication.data ?? []) {
        const mapped = mapChatMessage(row);
        if (mapped && !seen.has(mapped.id)) {
          seen.add(mapped.id);
          rows.push(row);
        }
      }
    } else if (
      !isMissingRelation(byApplication.error.message) &&
      !/column/i.test(byApplication.error.message)
    ) {
      throw new Error(byApplication.error.message);
    }
  }

  return rows.map(mapChatMessage).filter((row): row is ChatMessage => row !== null);
}

export async function insertChatMessage(
  admin: Admin,
  input: {
    applicationId: string;
    bookingId?: string | null;
    senderId: string;
    body: string;
  },
) {
  const body = sanitizeMultiline(input.body, TEXT_LIMITS.message);
  if (!body) {
    throw new Error("Bitte eine Nachricht zwischen 1 und 2000 Zeichen schreiben.");
  }

  const bookingId = await resolveBookingIdForApplication(
    admin,
    input.applicationId,
    input.bookingId ?? null,
  );
  if (!bookingId) {
    throw new Error("Chat ist erst nach der Terminbestätigung möglich.");
  }

  const threadIds = [...new Set([input.applicationId, bookingId].filter(Boolean))];
  const attempts: Record<string, unknown>[] = threadIds.flatMap((threadId) => [
    {
      booking_id: threadId,
      from_user_id: input.senderId,
      message: body,
    },
  ]);
  attempts.push({
    application_id: input.applicationId,
    booking_id: bookingId,
    sender_id: input.senderId,
    from_user_id: input.senderId,
    body,
    message: body,
  });

  let lastError = "Nachricht konnte nicht gesendet werden.";
  for (const row of attempts) {
    try {
      const saved = await insertFlexible(admin, "messages", row);
      const mapped =
        mapChatMessage(saved) ??
        mapChatMessage({
          id: String(saved.id ?? crypto.randomUUID()),
          application_id: input.applicationId,
          booking_id: bookingId,
          sender_id: input.senderId,
          from_user_id: input.senderId,
          body,
          message: body,
          created_at: String(saved.created_at ?? new Date().toISOString()),
        });
      if (mapped) {
        return mapped;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}
