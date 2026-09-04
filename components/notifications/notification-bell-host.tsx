import { loadNotificationsForUser } from "@/lib/notifications/create";
import { getProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { type UserRole } from "@/lib/supabase/env";
import { NotificationBell } from "@/components/notifications/notification-bell";

export async function NotificationBellHost() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    let role: UserRole = "customer";
    try {
      const profile = await getProfile(user.id);
      if (profile?.role) {
        role = profile.role;
      }
    } catch {
      role = "customer";
    }

    const initialItems = await loadNotificationsForUser(user.id);
    return <NotificationBell userId={user.id} role={role} initialItems={initialItems} />;
  } catch (error) {
    console.error(
      "Notification bell failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
