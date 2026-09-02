"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type NotificationRow } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/client";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function asNotification(value: unknown): NotificationRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") {
    return null;
  }
  return {
    id: row.id,
    type: String(row.type ?? ""),
    title: row.title,
    message: String(row.message ?? ""),
    read_at: (row.read_at as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export function NotificationBell({
  userId,
  initialItems,
}: {
  userId: string;
  initialItems: NotificationRow[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setItems(data as NotificationRow[]);
    }
  }, [userId]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
          const incoming = asNotification(payload.new);
          if (!incoming) {
            void load();
            return;
          }
          setItems((current) => {
            if (current.some((item) => item.id === incoming.id)) {
              return current;
            }
            return [incoming, ...current].slice(0, 20);
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && !cancelled) {
          void load();
        }
      });

    const poll = window.setInterval(() => {
      void load();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const unread = items.filter((item) => !item.read_at).length;

  async function markAllRead() {
    const unreadIds = items.filter((item) => !item.read_at).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.read_at ? item : { ...item, read_at: new Date().toISOString() },
      ),
    );

    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      await markAllRead();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => void toggleOpen()}
        className="relative rounded-full border border-ink/15 p-2 text-ink transition hover:border-gold"
        aria-label={unread > 0 ? `${unread} neue Benachrichtigungen` : "Benachrichtigungen"}
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
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_20px_50px_rgba(28,23,20,0.12)]">
          <div className="border-b border-ink/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Mitteilungen</p>
            <p className="mt-1 text-sm text-ink">Neue Bewerbungen und Terminbestätigungen</p>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-sm text-ink-soft">Noch keine Benachrichtigungen.</li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className={`border-b border-ink/5 px-4 py-3 last:border-0 ${
                    item.read_at ? "" : "bg-gold/10"
                  }`}
                >
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.message}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatWhen(item.created_at)}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
