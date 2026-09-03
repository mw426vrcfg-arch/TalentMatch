"use server";

import { markNotificationsRead } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsReadAction(ids: string[]) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || ids.length === 0) {
      return;
    }

    await markNotificationsRead(user.id, ids);
  } catch (error) {
    console.error(
      "Notification update failed:",
      error instanceof Error ? error.message : error,
    );
  }
}
