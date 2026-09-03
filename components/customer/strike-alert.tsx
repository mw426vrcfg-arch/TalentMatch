"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadMyStrikeStatus } from "@/app/dashboard/strike-actions";
import { createClient } from "@/lib/supabase/client";

function dismissalKey(userId: string, count: number) {
  return `talentmatch:strike-alert:${userId}:${count}`;
}

export function StrikeAlert({
  userId,
  initialCount,
}: {
  userId: string;
  initialCount: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(dismissalKey(userId, count)) === "1");
    } catch {
      setDismissed(false);
    } finally {
      setReady(true);
    }
  }, [count, userId]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refreshCount() {
      const status = await loadMyStrikeStatus();
      if (cancelled) {
        return;
      }
      setCount(status.count);
      if (status.banned) {
        await createClient().auth.signOut();
        window.location.assign("/login?error=strikes");
      } else {
        router.refresh();
      }
    }

    const channel = supabase
      .channel(`strikes-watch:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "strikes",
          filter: `customer_id=eq.${userId}`,
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void refreshCount();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  if (!ready || count <= 0 || dismissed) {
    return null;
  }

  function dismiss() {
    try {
      sessionStorage.setItem(dismissalKey(userId, count), "1");
    } catch {
      /* ignore quota / private mode */
    }
    setDismissed(true);
  }

  return (
    <div className="ui-alert-error relative mb-8 px-5 py-4 pr-12">
      <button
        type="button"
        onClick={dismiss}
        className="ui-icon-btn absolute right-3 top-3 h-8 w-8 text-neutral-400 hover:text-neutral-900"
        aria-label="Warnung schließen"
      >
        <span className="text-lg leading-none" aria-hidden>
          ×
        </span>
      </button>
      <p className="text-sm font-semibold text-ink">
        Achtung: Du hast {count} von 3 Strikes erhalten!
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {count >= 3
          ? "Dein Zugang wird jetzt gesperrt."
          : "Beim dritten Strike wird dein Login dauerhaft gesperrt."}
      </p>
    </div>
  );
}
