"use server";

import { sanitizeUuid } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  assertChatParticipant,
  insertChatMessage,
  loadMessagesForApplication,
  resolveBookingIdForApplication,
  type ChatMessage,
} from "@/lib/messages/store";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Bitte anmelden.");
  }
  return user;
}

export async function loadChatMessagesAction(
  applicationId: string,
  bookingId?: string | null,
): Promise<ChatMessage[]> {
  const user = await currentUser();
  const id = sanitizeUuid(applicationId);
  if (!id) {
    throw new Error("Termin nicht gefunden.");
  }
  const admin = createAdminClient();
  await assertChatParticipant(admin, user.id, id);
  const resolvedBookingId = await resolveBookingIdForApplication(
    admin,
    id,
    sanitizeUuid(bookingId) || null,
  );
  return loadMessagesForApplication(admin, id, resolvedBookingId);
}

export async function sendChatMessageAction(input: {
  applicationId: string;
  bookingId?: string | null;
  body: string;
}): Promise<{ message?: ChatMessage; error?: string }> {
  try {
    const user = await currentUser();
    const applicationId = sanitizeUuid(input.applicationId);
    if (!applicationId) {
      return { error: "Termin nicht gefunden." };
    }
    const admin = createAdminClient();
    await assertChatParticipant(admin, user.id, applicationId);
    const message = await insertChatMessage(admin, {
      applicationId,
      bookingId: sanitizeUuid(input.bookingId) || null,
      senderId: user.id,
      body: input.body,
    });
    if (!message) {
      return { error: "Nachricht konnte nicht gesendet werden." };
    }
    return { message };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden.",
    };
  }
}
