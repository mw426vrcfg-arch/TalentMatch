import { sanitizeLine, sanitizeMultiline, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type NotificationType =
  | "application_received"
  | "application_accepted"
  | "application_rejected"
  | "booking_confirmed"
  | "offer_published"
  | "booking_cancelled"
  | "swap_requested"
  | "swap_accepted"
  | "swap_rejected";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const NOTIFICATION_COLUMNS = "id, type, title, message, is_read, created_at";

function mapNotificationRow(value: unknown): NotificationRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    type: String(row.type ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    is_read: row.is_read === true,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function createNotification(
  admin: AdminClient,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    applicationId?: string | null;
    offerId?: string | null;
  },
) {
  // Titel und Text sind serverseitig formuliert, enthalten aber oft Nutzerdaten
  // (Name, Angebots-Titel) – deshalb auch hier durch den Sanitizer.
  const title = sanitizeLine(input.title, TEXT_LIMITS.title);
  const message = sanitizeMultiline(input.message, TEXT_LIMITS.comment);

  const row = {
    user_id: input.userId,
    type: input.type,
    title,
    message,
    is_read: false,
    application_id: input.applicationId ?? null,
    offer_id: input.offerId ?? null,
  };

  const { error } = await admin.from("notifications").insert(row);

  if (!error) {
    return;
  }

  if (/notifications_type_check|offer_published|booking_cancelled|swap_/i.test(error.message)) {
    const fallback = await admin.from("notifications").insert({
      ...row,
      type: "booking_confirmed",
    });
    if (!fallback.error) {
      return;
    }
  }

  const { error: retryError } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title,
    message,
    is_read: false,
  });

  if (retryError) {
    console.error("Notification insert failed:", error.message, retryError.message);
  }
}

export async function loadNotificationsForUser(userId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Notification load failed:", error.message);
      return [] as NotificationRow[];
    }

    return ((data ?? []) as unknown[]).map(mapNotificationRow).filter((row): row is NotificationRow => row !== null);
  } catch (error) {
    console.error(
      "Notification load failed:",
      error instanceof Error ? error.message : error,
    );
    return [] as NotificationRow[];
  }
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .in("id", ids)
      .eq("is_read", false);

    if (error) {
      console.error("Notification update failed:", error.message);
    }
  } catch (error) {
    console.error(
      "Notification update failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export { mapNotificationRow, NOTIFICATION_COLUMNS };
