"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/i18n-provider";

export function InviteSalonCard({
  inviteUrl,
  referralsThisMonth,
  urgentLimit,
}: {
  inviteUrl: string;
  referralsThisMonth: number;
  urgentLimit: number;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink">
        {t("salon.inviteIntro")}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 truncate rounded-full border border-white/30 bg-white/70 px-4 py-2.5 text-xs text-ink-soft">
          {inviteUrl}
        </p>
        <button type="button" onClick={() => void copyLink()} className="ui-btn-secondary shrink-0 px-4 text-xs">
          {copied ? t("actions.copied") : t("actions.copyLink")}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">
        {referralsThisMonth === 0
          ? t("salon.inviteNone", { limit: urgentLimit })
          : t("salon.inviteSome", {
              count:
                referralsThisMonth === 1
                  ? t("salon.inviteOne")
                  : t("salon.inviteMany", { count: referralsThisMonth }),
              limit: urgentLimit,
            })}
      </p>
    </div>
  );
}
