export const TYPING_EVENT = "typing";

export type TypingBroadcast = {
  userId: string;
  typing: boolean;
};

export function chatRealtimeChannel(applicationId: string, bookingId: string | null) {
  return `messages:${bookingId || applicationId}`;
}

export function parseTypingPayload(value: unknown): TypingBroadcast | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as { userId?: unknown; user_id?: unknown; typing?: unknown };
  const userId = typeof row.userId === "string" ? row.userId : typeof row.user_id === "string" ? row.user_id : "";
  if (!userId) {
    return null;
  }

  return { userId, typing: row.typing === true };
}
