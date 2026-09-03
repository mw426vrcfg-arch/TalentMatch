"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavoriteAction } from "@/app/favorites/actions";

export function FavoriteHeart({
  offerId,
  initialSaved,
}: {
  offerId: string;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved, offerId]);

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          try {
            const result = await toggleFavoriteAction(offerId);
            setSaved(result);
            router.refresh();
          } catch {
            setSaved(!next);
          }
        });
      }}
      className={`ui-icon-btn ${
        saved ? "border-rose/30 bg-rose/10 text-rose hover:bg-rose/15" : ""
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z"
        />
      </svg>
    </button>
  );
}
