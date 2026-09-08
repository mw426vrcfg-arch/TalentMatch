"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { loadChatMessagesAction, sendChatMessageAction } from "@/app/messages/actions";
import { TypingBubble } from "@/components/messages/typing-bubble";
import { SkeletonChat } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { mapChatMessage, mergeChatMessages, messageInThread, type ChatMessage } from "@/lib/messages/store";
import {
  TYPING_EVENT,
  chatRealtimeChannel,
  parseTypingPayload,
} from "@/lib/messages/typing";
import { sanitizeUuid } from "@/lib/security/sanitize";
import { intlLocale } from "@/lib/i18n/config";
import { useLocale, useLocalize, useT } from "@/components/i18n/i18n-provider";
import { CustomTimeActions } from "@/components/messages/custom-time-actions";
import {
  isOfficialConfirmMessage,
  officialConfirmDisplay,
} from "@/lib/applications/custom-time";

type LocalChatMessage = ChatMessage & { failed?: boolean };

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function SendFailedIcon({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF3B30] text-white"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path strokeLinecap="round" d="M12 8v5.5M12 16.5v.5" />
      </svg>
    </span>
  );
}

export function AppointmentChat({
  applicationId,
  bookingId,
  currentUserId,
  counterpartName,
  autoFocus = false,
  salonCustomTime = null,
  headerActions,
}: {
  applicationId: string;
  bookingId: string | null;
  currentUserId: string;
  counterpartName: string;
  autoFocus?: boolean;
  salonCustomTime?: { notes: string | null } | null;
  headerActions?: ReactNode;
}) {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [customTimeLocked, setCustomTimeLocked] = useState(false);
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
  const sendingIdsRef = useRef(new Set<string>());

  const safeApplicationId = sanitizeUuid(applicationId);
  const safeBookingId = sanitizeUuid(bookingId);

  const mergeMessage = useCallback((incoming: LocalChatMessage) => {
    if (incoming.sender_id !== currentUserId) {
      setPeerTyping(false);
    }
    setMessages((current) => mergeChatMessages(current, [incoming]));
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
        const failed = current.filter((message) => message.failed);
        const stillSending = current.filter((message) => {
          if (!sendingIdsRef.current.has(message.id)) {
            return false;
          }
          return !rows.some(
            (row) => row.sender_id === message.sender_id && row.body === message.body,
          );
        });
        return mergeChatMessages(rows, [...failed, ...stillSending]);
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
        },
        (payload) => {
          const incoming = mapChatMessage(payload.new);
          if (incoming && messageInThread(incoming, safeApplicationId, safeBookingId || null)) {
            mergeMessage(incoming);
            return;
          }
          void load(true);
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
    if (!body || !safeApplicationId) {
      return;
    }

    window.clearTimeout(typingIdleRef.current);
    lastTypingSentRef.current = 0;
    broadcastTyping(false);

    const tempId = crypto.randomUUID();
    const optimistic: LocalChatMessage = {
      id: tempId,
      application_id: safeApplicationId,
      booking_id: safeBookingId || safeApplicationId,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
    };

    sendingIdsRef.current.add(tempId);
    setDraft("");
    mergeMessage(optimistic);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    void sendChatMessageAction({
      applicationId: safeApplicationId,
      bookingId: safeBookingId || null,
      body,
    })
      .then((result) => {
        sendingIdsRef.current.delete(tempId);
        if (result.error || !result.message) {
          setMessages((current) =>
            current.map((message) => (message.id === tempId ? { ...message, failed: true } : message)),
          );
          setError(localize(result.error || t("chat.sendFailed")));
          return;
        }
        setError(null);
        setMessages((current) => {
          const withoutTemp = current.filter((message) => message.id !== tempId);
          return mergeChatMessages(withoutTemp, [result.message as ChatMessage]);
        });
      })
      .catch((sendError) => {
        sendingIdsRef.current.delete(tempId);
        setMessages((current) =>
          current.map((message) => (message.id === tempId ? { ...message, failed: true } : message)),
        );
        setError(
          sendError instanceof Error ? localize(sendError.message) : t("chat.sendFailed"),
        );
      });
  }

  return (
    <div
      className={`mt-5 overflow-hidden rounded-2xl border border-white/20 bg-white/55 backdrop-blur-xl ${
        autoFocus ? "ui-focus-card" : ""
      }`}
    >
      <div className="border-b border-white/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 basis-full">
            <p className="ui-kicker">{t("chat.kicker")}</p>
            <p className="mt-1 truncate text-sm text-ink">{t("chat.with", { name: counterpartName })}</p>
          </div>
          {headerActions ? (
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
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
            if (isOfficialConfirmMessage(message.body)) {
              return (
                <div
                  key={message.id}
                  className="rounded-2xl border border-emerald-200/80 bg-emerald-50/95 px-3 py-2.5 text-center text-sm font-medium leading-relaxed text-emerald-950"
                >
                  {officialConfirmDisplay(message.body)}
                </div>
              );
            }
            const mine = message.sender_id === currentUserId;
            return (
              <div key={message.id} className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
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
                {message.failed ? <SendFailedIcon label={t("chat.sendFailed")} /> : null}
              </div>
            );
          })
        )}
      </div>
      {error ? <p className="px-4 pb-2 text-xs text-rose">{error}</p> : null}
      {salonCustomTime &&
      !customTimeLocked &&
      !messages.some((message) => isOfficialConfirmMessage(message.body)) ? (
        <CustomTimeActions
          applicationId={safeApplicationId}
          customTimeNotes={salonCustomTime.notes}
          onCounterProposal={() => inputRef.current?.focus()}
          onConfirmed={(message) => {
            if (message) {
              mergeMessage(message);
            }
            setCustomTimeLocked(true);
          }}
        />
      ) : null}
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
          <button type="submit" disabled={!draft.trim()} className="ui-btn-primary px-4">
            {t("actions.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
