import { createClient } from "@/lib/supabase/server";
import { InAppPushToasts } from "@/components/notifications/in-app-push";

export async function InAppPushHost() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    return <InAppPushToasts userId={user.id} />;
  } catch {
    return null;
  }
}
