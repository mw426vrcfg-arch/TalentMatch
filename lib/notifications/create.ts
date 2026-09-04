import { sanitizeLine, sanitizeMultiline, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapNotificationRow,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_COLUMNS_BASIC,
  type NotificationRow,
} from "@/lib/notifications/rows";

export type { NotificationRow } from "@/lib/notifications/rows";
export { mapNotificationRow, mergeNotificationLists, NOTIFICATION_COLUMNS } from "@/lib/notifications/rows";

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
    const first = await admin
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const result =
      first.error && /application_id|offer_id|column/i.test(first.error.message)
        ? await admin
            .from("notifications")
            .select(NOTIFICATION_COLUMNS_BASIC)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20)
        : first;

    if (result.error) {
      console.error("Notification load failed:", result.error.message);
      return [] as NotificationRow[];
    }

    return ((result.data ?? []) as unknown[])
      .map(mapNotificationRow)
      .filter((row): row is NotificationRow => row !== null);
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

export async function markAllNotificationsRead(userId: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
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
