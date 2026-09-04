"use client";

import { useEffect, useRef, useState } from "react";
import { loadBannerSenderNameAction } from "@/app/notifications/banner-actions";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { notificationCopy } from "@/lib/i18n/messages";
import { mapNotificationRow, type NotificationRow } from "@/lib/notifications/rows";
import { readPushEnabled, PUSH_PREF_EVENT } from "@/lib/notifications/push-pref";
import { createClient } from "@/lib/supabase/client";
import { mapChatMessage } from "@/lib/messages/store";

type Banner = {
  id: string;
  title: string;
  body: string;
};

const ALWAYS_PUSHED = new Set([
  "application_accepted",
  "application_rejected",
  "booking_cancelled",
  "swap_requested",
  "swap_accepted",
  "swap_rejected",
]);

function shouldShowNotification(row: NotificationRow) {
  if (ALWAYS_PUSHED.has(row.type)) {
    return true;
  }
  return (
    row.type === "booking_confirmed" &&
    /storn|reaktiv|Willkommen zurück|verschieb/i.test(`${row.title} ${row.message}`)
  );
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

export function InAppPushToasts({ userId }: { userId: string }) {
  const t = useT();
  const localize = useLocalize();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [pushOn, setPushOn] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const queue = useRef<Banner[]>([]);
  const showing = useRef(false);

  useEffect(() => {
    setPushOn(readPushEnabled());
    function onPref(event: Event) {
      const enabled = (event as CustomEvent<boolean>).detail !== false && readPushEnabled();
      setPushOn(enabled);
      if (!enabled) {
        queue.current = [];
        setBanner(null);
        showing.current = false;
      }
    }
    window.addEventListener(PUSH_PREF_EVENT, onPref);
    return () => window.removeEventListener(PUSH_PREF_EVENT, onPref);
  }, []);

  function enqueue(next: Banner) {
    if (!readPushEnabled()) {
      return;
    }
    queue.current.push(next);
    void pump();
  }

  async function pump() {
    if (showing.current) {
      return;
    }
    const next = queue.current.shift();
    if (!next) {
      return;
    }
    showing.current = true;
    setBanner(next);
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
    }
    hideTimer.current = window.setTimeout(() => {
      setBanner(null);
      showing.current = false;
      window.setTimeout(() => {
        void pump();
      }, 280);
    }, 4000);
  }

  useEffect(() => {
    const supabase = createClient();

    const notifications = supabase
      .channel(`push-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = mapNotificationRow(payload.new);
          if (!row || !shouldShowNotification(row)) {
            return;
          }
          const copy = notificationText(row, t, localize);
          enqueue({ id: row.id, title: copy.title, body: copy.body });
        },
      )
      .subscribe();

    const messages = supabase
      .channel(`push-messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = mapChatMessage(payload.new);
          if (!row || row.sender_id === userId) {
            return;
          }
          const preview = row.body.length > 90 ? `${row.body.slice(0, 87)}…` : row.body;
          void loadBannerSenderNameAction(row.sender_id).then((name) => {
            enqueue({
              id: row.id,
              title: name,
              body: preview,
            });
          });
        },
      )
      .subscribe();

    return () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
      }
      void supabase.removeChannel(notifications);
      void supabase.removeChannel(messages);
    };
  }, [localize, t, userId]);

  if (!banner || !pushOn) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        key={banner.id}
        className="pointer-events-auto w-full max-w-md animate-push rounded-xl border border-white/20 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">TalentMatch</p>
        <p className="mt-1 text-sm font-semibold text-ink">{banner.title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{banner.body}</p>
      </div>
    </div>
  );
}
