"use server";

import { sanitizeUuid } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  assertChatParticipant,
  insertChatMessage,
  loadMessagesForApplication,
  resolveBookingIdForApplication,
  resolveChatRecipientId,
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

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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
    const senderId = sanitizeUuid(user.id);
    const applicationId = sanitizeUuid(input.applicationId);
    const bookingId = sanitizeUuid(input.bookingId) || null;
    if (!senderId || !applicationId) {
      return { error: "Termin nicht gefunden." };
    }
    const admin = createAdminClient();
    await assertChatParticipant(admin, senderId, applicationId);
    const recipientId = sanitizeUuid(await resolveChatRecipientId(admin, applicationId, senderId)) || null;
    const message = await withTimeout(
      insertChatMessage(admin, {
        applicationId,
        bookingId,
        senderId,
        recipientId,
        body: input.body,
      }),
      8000,
      "Das Senden hat zu lange gedauert.",
    );
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
