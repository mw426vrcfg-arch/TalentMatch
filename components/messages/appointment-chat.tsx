"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadChatMessagesAction, sendChatMessageAction } from "@/app/messages/actions";
import { SkeletonChat } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { mapChatMessage, type ChatMessage } from "@/lib/messages/store";
import { sanitizeUuid } from "@/lib/security/sanitize";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AppointmentChat({
  applicationId,
  bookingId,
  currentUserId,
  counterpartName,
}: {
  applicationId: string;
  bookingId: string | null;
  currentUserId: string;
  counterpartName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const realtimeOk = useRef(false);

  const safeApplicationId = sanitizeUuid(applicationId);
  const safeBookingId = sanitizeUuid(bookingId);

  const mergeMessage = useCallback((incoming: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === incoming.id)) {
        return current;
      }
      return [...current, incoming].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!safeApplicationId) {
      if (!silent) {
        setError("Termin nicht gefunden.");
      }
      setLoaded(true);
      return;
    }
    try {
      const rows = await loadChatMessagesAction(safeApplicationId, safeBookingId || null);
      setMessages((current) => {
        if (rows.length === 0 && current.length > 0) {
          return current;
        }
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const item of current) {
          if (!byId.has(item.id)) {
            byId.set(item.id, item);
          }
        }
        return [...byId.values()].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      });
      if (!silent) {
        setError(null);
      }
    } catch (loadError) {
      if (!silent) {
        setError(loadError instanceof Error ? loadError.message : "Chat konnte nicht geladen werden.");
      }
    } finally {
      setLoaded(true);
    }
  }, [safeApplicationId, safeBookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!safeApplicationId && !safeBookingId) {
      return;
    }

    const supabase = createClient();
    const filter = `booking_id=eq.${safeApplicationId}`;

    const channel = supabase
      .channel(`messages:${safeBookingId || safeApplicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter,
        },
        (payload) => {
          const incoming = mapChatMessage(payload.new);
          if (incoming) {
            mergeMessage(incoming);
          } else {
            void load(true);
          }
        },
      )
      .subscribe((status) => {
        realtimeOk.current = status === "SUBSCRIBED";
      });

    const poll = window.setInterval(() => {
      void load(true);
    }, 2500);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [safeApplicationId, safeBookingId, load, mergeMessage]);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body || pending) {
      return;
    }
    setDraft("");
    startTransition(async () => {
      const result = await sendChatMessageAction({
        applicationId: safeApplicationId,
        bookingId: safeBookingId || null,
        body,
      });
      if (result.error) {
        setError(result.error);
        setDraft(body);
        return;
      }
      if (result.message) {
        mergeMessage(result.message);
      }
      setError(null);
    });
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-white/20 bg-white/55 backdrop-blur-xl">
      <div className="border-b border-white/20 px-4 py-3">
        <p className="ui-kicker">Nachrichten</p>
        <p className="mt-1 text-sm text-ink">Chat mit {counterpartName}</p>
      </div>
      <div ref={listRef} className="max-h-56 space-y-2 overflow-y-auto px-4 py-3">
        {!loaded ? (
          <SkeletonChat />
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            Noch keine Nachricht. Klärt Details zum Termin in Echtzeit.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    mine
                      ? "bg-zinc-900/90 text-white"
                      : "border border-white/30 bg-white/80 text-ink"
                  }`}
                >
                  <p>{message.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-ink-soft"}`}>
                    {formatWhen(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {error ? <p className="px-4 pb-2 text-xs text-rose">{error}</p> : null}
      <form
        className="flex gap-2 border-t border-white/20 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          placeholder="Nachricht schreiben…"
          className="ui-input min-h-10 py-2"
        />
        <button type="submit" disabled={pending || !draft.trim()} className="ui-btn-primary px-4">
          {pending ? "…" : "Senden"}
        </button>
      </form>
    </div>
  );
}
