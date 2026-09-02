"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadMyStrikeStatus } from "@/app/dashboard/strike-actions";
import { createClient } from "@/lib/supabase/client";

export function StrikeAlert({
  userId,
  initialCount,
}: {
  userId: string;
  initialCount: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

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

  if (count <= 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-2xl border border-red-600/40 bg-red-600/10 px-5 py-4">
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
