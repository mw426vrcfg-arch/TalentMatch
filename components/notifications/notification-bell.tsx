"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { markAllNotificationsReadAction } from "@/app/notifications/actions";
import {
  mapNotificationRow,
  mergeNotificationLists,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_COLUMNS_BASIC,
  type NotificationRow,
} from "@/lib/notifications/rows";
import { hrefForNotification } from "@/lib/notifications/links";
import { createClient } from "@/lib/supabase/client";
import { mapChatMessage } from "@/lib/messages/store";
import { type UserRole } from "@/lib/supabase/env";
import { hapticTap } from "@/lib/ui/haptic";
import { intlLocale } from "@/lib/i18n/config";
import { notificationCopy } from "@/lib/i18n/messages";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";

const lastClearedAt = new Map<string, number>();

function wasCleared(userId: string, item: NotificationRow) {
  const cleared = lastClearedAt.get(userId);
  if (!cleared) {
    return item.is_read;
  }
  return item.is_read || new Date(item.created_at).getTime() <= cleared;
}

function notificationText(
  item: NotificationRow,
  t: ReturnType<typeof useT>,
  localize: ReturnType<typeof useLocalize>,
) {
  const copy = notificationCopy(item.type, t);
  const locTitle = localize(item.title);
  const locBody = localize(item.message);
  return {
    title: locTitle !== item.title ? locTitle : copy.title.includes("{") ? locTitle : copy.title,
    body: locBody !== item.message ? locBody : copy.body.includes("{") ? locBody : copy.body,
  };
}

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function NotificationBell({
  userId,
  role,
  initialItems,
  inboxHref = "/dashboard/applications",
}: {
  userId: string;
  role: UserRole;
  initialItems: NotificationRow[];
  inboxHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const [chatUnread, setChatUnread] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const localize = useLocalize();
  const locale = useLocale();
  const markedReadIds = useRef(new Set(initialItems.filter((item) => item.is_read).map((item) => item.id)));
  const seeded = useRef(false);

  const mergeIncoming = useCallback((incoming: NotificationRow[]) => {
    for (const item of incoming) {
      if (wasCleared(userId, item)) {
        markedReadIds.current.add(item.id);
      }
    }
    setItems((current) => mergeNotificationLists(current, incoming, markedReadIds.current));
  }, [userId]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const first = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const result =
      first.error && /application_id|offer_id|column/i.test(first.error.message)
        ? await supabase
            .from("notifications")
            .select(NOTIFICATION_COLUMNS_BASIC)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20)
        : first;

    if (result.error) {
      console.error("Notification load failed:", result.error.message);
      return;
    }

    mergeIncoming(
      ((result.data ?? []) as unknown[])
        .map(mapNotificationRow)
        .filter((row): row is NotificationRow => row !== null),
    );
  }, [mergeIncoming, userId]);

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      setItems(initialItems);
      return;
    }

    mergeIncoming(initialItems);
  }, [initialItems, mergeIncoming]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    for (const existing of supabase.getChannels()) {
      if (existing.topic.includes(`notifications:${userId}`)) {
        void supabase.removeChannel(existing);
      }
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = mapNotificationRow(payload.new);
          if (incoming) {
            mergeIncoming([incoming]);
          }
          void load();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = mapNotificationRow(payload.new);
          if (incoming) {
            mergeIncoming([incoming]);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incoming = mapChatMessage(payload.new);
          if (incoming && incoming.sender_id !== userId) {
            setChatUnread(true);
          }
        },
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (!cancelled) {
        void load();
      }
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [load, mergeIncoming, userId]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const unread = items.filter((item) => !wasCleared(userId, item)).length;
  const hasUnread = unread > 0 || chatUnread;

  function markVisibleRead() {
    lastClearedAt.set(userId, Date.now());
    setChatUnread(false);
    setItems((current) => {
      for (const item of current) {
        markedReadIds.current.add(item.id);
      }
      return current.map((item) => (item.is_read ? item : { ...item, is_read: true }));
    });
    void markAllNotificationsReadAction();
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    hapticTap("light");
    if (next) {
      markVisibleRead();
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative ui-icon-btn"
        aria-expanded={open}
        aria-label={
          hasUnread
            ? t("notifications.ariaUnread", { count: Math.max(unread, 1) })
            : t("notifications.aria")
        }
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {hasUnread ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose ring-2 ring-white" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[24px] border border-white/25 bg-white/78 shadow-[0_24px_80px_rgba(15,15,20,0.14)] backdrop-blur-2xl ui-sheet">
          <div className="border-b border-white/25 px-4 py-3">
            <p className="ui-kicker">{t("notifications.title")}</p>
            <p className="mt-1 text-sm text-ink">{t("notifications.subtitle")}</p>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-5 py-12 text-center text-sm leading-relaxed text-ink-soft">
                {t("notifications.empty")}
              </li>
            ) : (
              items.map((item) => {
                const copy = notificationText(item, t, localize);
                return (
                <li key={item.id} className="border-b border-white/20 last:border-0">
                  <Link
                    href={hrefForNotification(item, role)}
                    onClick={() => {
                      hapticTap("light");
                      setOpen(false);
                    }}
                    className={`block px-4 py-3.5 transition duration-300 ease-out hover:bg-white/70 active:scale-[0.99] ${
                      wasCleared(userId, item) ? "" : "bg-white/45"
                    }`}
                  >
                    <p className="text-sm font-medium text-ink">{copy.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{copy.body}</p>
                    <p className="mt-1 text-xs text-ink-soft">{formatWhen(item.created_at, intlLocale(locale))}</p>
                  </Link>
                </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-white/25 p-2">
            <Link
              href={inboxHref}
              onClick={() => {
                hapticTap("light");
                setOpen(false);
              }}
              className="flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-ink transition duration-300 hover:bg-white/70"
            >
              {t("notifications.openInbox")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
