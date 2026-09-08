import { isCustomTimeRequest } from "@/lib/applications/custom-time";
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
    application_id: firstString(row, ["application_id"]) || firstString(row, ["booking_id"]) || "",
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
    status === "completed" ||
    status === "requested_custom_time"
  );
}

export function canOpenApplicationChat(
  status: string,
  notes?: string | null,
  customTimeNotes?: string | null,
) {
  return isMessagingEnabled(status) || isCustomTimeRequest(status, notes, customTimeNotes);
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
  const first = await admin
    .from("applications")
    .select("id, status, customer_id, offer_id, notes, custom_time_notes")
    .eq("id", applicationId)
    .maybeSingle();

  const application =
    !first.error && first.data
      ? first.data
      : first.error && /custom_time_notes/i.test(first.error.message)
        ? (
            await admin
              .from("applications")
              .select("id, status, customer_id, offer_id, notes")
              .eq("id", applicationId)
              .maybeSingle()
          ).data
        : null;

  if (!application) {
    throw new Error(first.error?.message ?? "Termin nicht gefunden.");
  }

  const row = application;
  const status = String(row.status);
  const notes = (row.notes as string | null | undefined) ?? null;
  const customTimeNotes =
    "custom_time_notes" in row ? ((row.custom_time_notes as string | null | undefined) ?? null) : null;

  if (!canOpenApplicationChat(status, notes, customTimeNotes)) {
    throw new Error("Nachrichten sind erst nach der Zusage möglich.");
  }

  if (row.customer_id === userId) {
    return row;
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, business_id")
    .eq("id", row.offer_id)
    .maybeSingle();

  if (!offer) {
    throw new Error("Kein Zugang zu diesem Chat.");
  }

  const businessId = offer.business_id as string;
  if (businessId === userId) {
    return row;
  }

  const { data: byId } = await admin
    .from("business_profiles")
    .select("user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (byId?.user_id === userId) {
    return row;
  }

  const { data: byUser } = await admin
    .from("business_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (byUser && (byUser.id === businessId || businessId === userId)) {
    return row;
  }

  throw new Error("Kein Zugang zu diesem Chat.");
}

export function chatThreadIds(applicationId: string, bookingId?: string | null) {
  return [...new Set([applicationId, bookingId].filter((value): value is string => Boolean(value)))];
}

export function mergeChatMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const row of [...existing, ...incoming]) {
    if (!row?.id) {
      continue;
    }
    byId.set(row.id, row);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function messageInThread(
  message: ChatMessage,
  applicationId: string,
  bookingId?: string | null,
) {
  const ids = new Set(chatThreadIds(applicationId, bookingId));
  return Boolean(
    (message.application_id && ids.has(message.application_id)) ||
      (message.booking_id && ids.has(message.booking_id)),
  );
}

export function isUnthreadedChatMessage(message: ChatMessage) {
  return !message.application_id && !message.booking_id;
}

async function loadConversationParticipantIds(admin: Admin, applicationId: string) {
  const { data: application } = await admin
    .from("applications")
    .select("customer_id, offer_id, created_at")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application?.customer_id) {
    return { participantIds: [] as string[], since: undefined as string | undefined };
  }

  const participantIds = [String(application.customer_id)];
  const { data: offer } = await admin
    .from("offers")
    .select("business_id")
    .eq("id", application.offer_id)
    .maybeSingle();
  const businessId = offer?.business_id ? String(offer.business_id) : "";
  if (businessId) {
    participantIds.push(businessId);
    const { data: byId } = await admin
      .from("business_profiles")
      .select("id, user_id")
      .eq("id", businessId)
      .maybeSingle();
    if (byId?.user_id) {
      participantIds.push(String(byId.user_id));
    }
    if (byId?.id) {
      participantIds.push(String(byId.id));
    }
    const { data: byUser } = await admin
      .from("business_profiles")
      .select("id, user_id")
      .eq("user_id", businessId)
      .maybeSingle();
    if (byUser?.user_id) {
      participantIds.push(String(byUser.user_id));
    }
    if (byUser?.id) {
      participantIds.push(String(byUser.id));
    }
  }

  const since = application.created_at
    ? new Date(new Date(String(application.created_at)).getTime() - 60_000).toISOString()
    : undefined;

  return { participantIds: [...new Set(participantIds.filter(Boolean))], since };
}

async function attachMessagesToThread(admin: Admin, messageIds: string[], threadId: string) {
  if (messageIds.length === 0) {
    return;
  }
  const { error } = await admin.from("messages").update({ booking_id: threadId }).in("id", messageIds);
  if (error && !/column|foreign key|violates/i.test(error.message)) {
    console.warn("Chat-Thread konnte nicht nachgetragen werden:", error.message);
  }
}

export async function loadMessagesForApplication(
  admin: Admin,
  applicationId: string,
  bookingId?: string | null,
) {
  const resolvedBookingId = await resolveBookingIdForApplication(admin, applicationId, bookingId);
  const threadIds = chatThreadIds(applicationId, resolvedBookingId);

  async function query(column: "booking_id" | "application_id", value: string) {
    return admin
      .from("messages")
      .select("*")
      .eq(column, value)
      .order("created_at", { ascending: true })
      .limit(200);
  }

  const seen = new Set<string>();
  const messages: ChatMessage[] = [];

  function take(row: unknown, allowUnthreaded: boolean, since?: string) {
    const mapped = mapChatMessage(row);
    if (!mapped || seen.has(mapped.id)) {
      return;
    }
    const threaded = messageInThread(mapped, applicationId, resolvedBookingId);
    const unthreaded = isUnthreadedChatMessage(mapped);
    if (!threaded && !(allowUnthreaded && unthreaded)) {
      return;
    }
    if (unthreaded && since && new Date(mapped.created_at).getTime() < new Date(since).getTime()) {
      return;
    }
    seen.add(mapped.id);
    messages.push(mapped);
  }

  async function collect(column: "booking_id" | "application_id", value: string) {
    const { data, error } = await query(column, value);
    if (error) {
      if (!isMissingRelation(error.message) && !/column/i.test(error.message)) {
        throw new Error(error.message);
      }
      return;
    }
    for (const row of data ?? []) {
      take(row, false);
    }
  }

  for (const id of threadIds) {
    await collect("booking_id", id);
    await collect("application_id", id);
  }

  const { participantIds, since } = await loadConversationParticipantIds(admin, applicationId);
  if (participantIds.length > 0) {
    for (const column of ["from_user_id", "sender_id"] as const) {
      const { data, error } = await admin
        .from("messages")
        .select("*")
        .in(column, participantIds)
        .order("created_at", { ascending: true })
        .limit(400);
      if (error) {
        continue;
      }
      for (const row of data ?? []) {
        take(row, true, since);
      }
    }

    const orphanIds = messages
      .filter((message) => isUnthreadedChatMessage(message) && participantIds.includes(message.sender_id))
      .map((message) => message.id);
    await attachMessagesToThread(admin, orphanIds, applicationId);
  }

  return mergeChatMessages([], messages);
}

function mapSavedChatMessage(
  saved: Record<string, unknown>,
  input: { applicationId: string; bookingId?: string | null; senderId: string; body: string },
) {
  const threadId =
    firstString(saved, ["booking_id", "application_id"]) || input.applicationId || input.bookingId || "";
  return (
    mapChatMessage(saved) ??
    mapChatMessage({
      id: String(saved.id ?? crypto.randomUUID()),
      application_id: input.applicationId,
      booking_id: threadId || null,
      sender_id: input.senderId,
      from_user_id: input.senderId,
      body: input.body,
      message: input.body,
      created_at: String(saved.created_at ?? new Date().toISOString()),
    })
  );
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
  const threadIds = chatThreadIds(input.applicationId, bookingId);

  const attempts: Record<string, unknown>[] = threadIds.flatMap((threadId) => [
    {
      booking_id: threadId,
      from_user_id: input.senderId,
      sender_id: input.senderId,
      message: body,
      body,
    },
    {
      application_id: input.applicationId,
      booking_id: threadId,
      sender_id: input.senderId,
      from_user_id: input.senderId,
      body,
      message: body,
    },
  ]);

  let lastError = "Nachricht konnte nicht gesendet werden.";
  for (const row of attempts) {
    try {
      const saved = await insertFlexible(admin, "messages", row, ["booking_id"]);
      const savedId = firstString(asRecord(saved) ?? {}, ["id"]);
      if (savedId && !firstString(asRecord(saved) ?? {}, ["booking_id", "application_id"])) {
        await attachMessagesToThread(admin, [savedId], input.applicationId);
        saved.booking_id = input.applicationId;
      }
      const mapped = mapSavedChatMessage(saved, { ...input, body, bookingId });
      if (mapped) {
        return {
          ...mapped,
          application_id: mapped.application_id || input.applicationId,
          booking_id: mapped.booking_id || input.applicationId,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  try {
    const saved = await insertFlexible(admin, "messages", {
      application_id: input.applicationId,
      sender_id: input.senderId,
      from_user_id: input.senderId,
      body,
      message: body,
    });
    const savedId = firstString(asRecord(saved) ?? {}, ["id"]);
    if (savedId) {
      await attachMessagesToThread(admin, [savedId], input.applicationId);
      saved.booking_id = firstString(asRecord(saved) ?? {}, ["booking_id"]) || input.applicationId;
    }
    const mapped = mapSavedChatMessage(saved, { ...input, body, bookingId });
    if (mapped) {
      return {
        ...mapped,
        application_id: mapped.application_id || input.applicationId,
        booking_id: mapped.booking_id || input.applicationId,
      };
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : lastError;
  }

  throw new Error(lastError);
}
