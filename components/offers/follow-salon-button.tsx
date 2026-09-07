"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollowAction } from "@/app/favorites/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";

export function FollowSalonButton({
  salonId,
  initialFollowing,
}: {
  salonId: string;
  initialFollowing: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing, salonId]);

  return (
    <button
      type="button"
      disabled={pending || !salonId}
      onClick={() => {
        const next = !following;
        setFollowing(next);
        startTransition(async () => {
          try {
            const result = await toggleFollowAction(salonId);
            setFollowing(result);
            router.refresh();
          } catch {
            setFollowing(!next);
          }
        });
      }}
      className={following ? "ui-btn-primary" : "ui-btn-secondary"}
      aria-busy={pending}
    >
      {pending ? (
        <BusyLabel>{t("common.sending")}</BusyLabel>
      ) : following ? (
        t("actions.unfollow")
      ) : (
        t("actions.follow")
      )}
    </button>
  );
}
