"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { loadChatMessagesAction, sendChatMessageAction } from "@/app/messages/actions";
import { TypingBubble } from "@/components/messages/typing-bubble";
import { SkeletonChat } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { mapChatMessage, type ChatMessage } from "@/lib/messages/store";
import {
  TYPING_EVENT,
  chatRealtimeChannel,
  parseTypingPayload,
} from "@/lib/messages/typing";
import { sanitizeUuid } from "@/lib/security/sanitize";
import { intlLocale } from "@/lib/i18n/config";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AppointmentChat({
  applicationId,
  bookingId,
  currentUserId,
  counterpartName,
  autoFocus = false,
}: {
  applicationId: string;
  bookingId: string | null;
  currentUserId: string;
  counterpartName: string;
  autoFocus?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [peerTyping, setPeerTyping] = useState(false);
  const t = useT();
  const localize = useLocalize();
  const locale = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const realtimeOk = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingIdleRef = useRef(0);
  const lastTypingSentRef = useRef(0);
  const peerWatchdogRef = useRef(0);

  const safeApplicationId = sanitizeUuid(applicationId);
  const safeBookingId = sanitizeUuid(bookingId);

  const mergeMessage = useCallback((incoming: ChatMessage) => {
    if (incoming.sender_id !== currentUserId) {
      setPeerTyping(false);
    }
    setMessages((current) => {
      if (current.some((item) => item.id === incoming.id)) {
        return current;
      }
      return [...current, incoming].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, [currentUserId]);

  const load = useCallback(async (silent = false) => {
    if (!safeApplicationId) {
      if (!silent) {
        setError(t("errors.appointmentNotFound"));
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
        setError(
          loadError instanceof Error ? localize(loadError.message) : t("errors.chatLoadFailed"),
        );
      }
    } finally {
      setLoaded(true);
    }
  }, [localize, safeApplicationId, safeBookingId, t]);

  const broadcastTyping = useCallback((typing: boolean) => {
    const channel = channelRef.current;
    if (!channel || !realtimeOk.current) {
      return;
    }
    void channel.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload: { userId: currentUserId, typing },
    });
  }, [currentUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!safeApplicationId && !safeBookingId) {
      return;
    }

    const supabase = createClient();
    const filter = `booking_id=eq.${safeApplicationId}`;
    const topic = chatRealtimeChannel(safeApplicationId, safeBookingId || null);

    const channel = supabase
      .channel(topic, {
        config: {
          broadcast: { self: false },
        },
      })
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
      .on("broadcast", { event: TYPING_EVENT }, (message) => {
        const payload = parseTypingPayload(message.payload) ?? parseTypingPayload(message);
        if (!payload || payload.userId === currentUserId) {
          return;
        }
        window.clearTimeout(peerWatchdogRef.current);
        if (!payload.typing) {
          setPeerTyping(false);
          return;
        }
        setPeerTyping(true);
        peerWatchdogRef.current = window.setTimeout(() => {
          setPeerTyping(false);
        }, 2200);
      })
      .subscribe((status) => {
        realtimeOk.current = status === "SUBSCRIBED";
        if (status === "SUBSCRIBED" && inputRef.current?.value.trim()) {
          void channel.send({
            type: "broadcast",
            event: TYPING_EVENT,
            payload: { userId: currentUserId, typing: true },
          });
        }
      });

    channelRef.current = channel;

    const poll = window.setInterval(() => {
      void load(true);
    }, 2500);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(typingIdleRef.current);
      window.clearTimeout(peerWatchdogRef.current);
      if (realtimeOk.current) {
        void channel.send({
          type: "broadcast",
          event: TYPING_EVENT,
          payload: { userId: currentUserId, typing: false },
        });
      }
      channelRef.current = null;
      realtimeOk.current = false;
      void supabase.removeChannel(channel);
    };
  }, [safeApplicationId, safeBookingId, currentUserId, load, mergeMessage]);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [autoFocus, loaded]);

  function signalTyping(nextDraft: string) {
    const isTyping = nextDraft.trim().length > 0;
    window.clearTimeout(typingIdleRef.current);

    if (!isTyping) {
      lastTypingSentRef.current = 0;
      broadcastTyping(false);
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentRef.current > 600) {
      lastTypingSentRef.current = now;
      broadcastTyping(true);
    }

    typingIdleRef.current = window.setTimeout(() => {
      lastTypingSentRef.current = 0;
      broadcastTyping(false);
    }, 1400);
  }

  function send() {
    const body = draft.trim();
    if (!body || pending) {
      return;
    }
    window.clearTimeout(typingIdleRef.current);
    lastTypingSentRef.current = 0;
    broadcastTyping(false);
    setDraft("");
    startTransition(async () => {
      const result = await sendChatMessageAction({
        applicationId: safeApplicationId,
        bookingId: safeBookingId || null,
        body,
      });
      if (result.error) {
        setError(localize(result.error));
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
    <div
      className={`mt-5 overflow-hidden rounded-2xl border border-white/20 bg-white/55 backdrop-blur-xl ${
        autoFocus ? "ui-focus-card" : ""
      }`}
    >
      <div className="border-b border-white/20 px-4 py-3">
        <p className="ui-kicker">{t("chat.kicker")}</p>
        <p className="mt-1 text-sm text-ink">{t("chat.with", { name: counterpartName })}</p>
      </div>
      <div ref={listRef} className="max-h-56 space-y-2 overflow-y-auto px-4 py-3">
        {!loaded ? (
          <SkeletonChat />
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            {t("chat.empty")}
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
                    {formatWhen(message.created_at, intlLocale(locale))}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {error ? <p className="px-4 pb-2 text-xs text-rose">{error}</p> : null}
      <div className="border-t border-white/20">
        {peerTyping ? (
          <TypingBubble label={t("chat.typing", { name: counterpartName })} />
        ) : null}
        <form
          className="flex gap-2 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              signalTyping(value);
            }}
            maxLength={2000}
            placeholder={t("chat.placeholder")}
            className="ui-input min-h-10 py-2"
          />
          <button type="submit" disabled={pending || !draft.trim()} className="ui-btn-primary px-4">
            {pending ? "…" : t("actions.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
