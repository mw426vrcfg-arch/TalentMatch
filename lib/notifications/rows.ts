export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  application_id: string | null;
  offer_id: string | null;
};

export const NOTIFICATION_COLUMNS =
  "id, type, title, message, is_read, created_at, application_id, offer_id";
export const NOTIFICATION_COLUMNS_BASIC = "id, type, title, message, is_read, created_at";

export function mapNotificationRow(value: unknown): NotificationRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    type: String(row.type ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    is_read: row.is_read === true,
    created_at: String(row.created_at ?? new Date().toISOString()),
    application_id: typeof row.application_id === "string" ? row.application_id : null,
    offer_id: typeof row.offer_id === "string" ? row.offer_id : null,
  };
}

export function mergeNotificationLists(
  current: NotificationRow[],
  incoming: NotificationRow[],
  keepReadIds?: Set<string>,
): NotificationRow[] {
  const byId = new Map<string, NotificationRow>();

  for (const item of current) {
    byId.set(item.id, item);
  }

  for (const item of incoming) {
    const previous = byId.get(item.id);
    byId.set(item.id, {
      ...item,
      is_read: Boolean(previous?.is_read || item.is_read || keepReadIds?.has(item.id)),
      application_id: item.application_id ?? previous?.application_id ?? null,
      offer_id: item.offer_id ?? previous?.offer_id ?? null,
    });
  }

  return [...byId.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
}
