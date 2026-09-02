import { loadNotificationsForUser } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/notification-bell";

export async function NotificationBellHost() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const initialItems = await loadNotificationsForUser(user.id);
  return <NotificationBell userId={user.id} initialItems={initialItems} />;
}
