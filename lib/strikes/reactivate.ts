import { createNotification } from "@/lib/notifications/create";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const REACTIVATION_TITLE = "Willkommen zurück!";
export const REACTIVATION_MESSAGE =
  "Willkommen zurück! Dein Konto wurde erfolgreich reaktiviert. Bitte achte auf pünktliches Erscheinen, um zukünftige Sperren zu vermeiden.";

export function isAccountLockedStatus(status: string | null | undefined) {
  return /gesperrt|banned|restricted/i.test(String(status ?? ""));
}

export async function notifyAccountReactivated(admin: Admin, userId: string) {
  await createNotification(admin, {
    userId,
    type: "booking_confirmed",
    title: REACTIVATION_TITLE,
    message: REACTIVATION_MESSAGE,
  });
}
