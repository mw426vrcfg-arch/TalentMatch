import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type NotificationType =
  | "application_received"
  | "application_accepted"
  | "application_rejected"
  | "booking_confirmed";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

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
  const row = {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    application_id: input.applicationId ?? null,
    offer_id: input.offerId ?? null,
  };

  const { error } = await admin.from("notifications").insert(row);

  if (!error) {
    return;
  }

  const { error: retryError } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
  });

  if (retryError) {
    console.error("Notification insert failed:", error.message, retryError.message);
  }
}

export async function loadNotificationsForUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, type, title, message, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Notification load failed:", error.message);
    return [] as NotificationRow[];
  }

  return (data as NotificationRow[] | null) ?? [];
}
