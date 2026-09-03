"use client";

import { useState } from "react";

export function InviteSalonCard({
  inviteUrl,
  referralsThisMonth,
  urgentLimit,
}: {
  inviteUrl: string;
  referralsThisMonth: number;
  urgentLimit: number;
}) {
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
        Teile deinen Link. Registriert sich ein Salon darüber, speichern wir die Empfehlung und dein
        Last-Minute-Limit steigt in diesem Monat von 3 auf 4.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 truncate rounded-full border border-white/30 bg-white/70 px-4 py-2.5 text-xs text-ink-soft">
          {inviteUrl}
        </p>
        <button type="button" onClick={() => void copyLink()} className="ui-btn-secondary shrink-0 px-4 text-xs">
          {copied ? "Kopiert" : "Link kopieren"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">
        {referralsThisMonth === 0
          ? `Diesen Monat noch keine Einladung eingelöst. Limit: ${urgentLimit} Last-Minute-Deals.`
          : `${referralsThisMonth === 1 ? "1 Salon" : `${referralsThisMonth} Salons`} über deinen Link. Limit diesen Monat: ${urgentLimit}.`}
      </p>
    </div>
  );
}
