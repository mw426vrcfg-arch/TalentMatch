"use client";

import { useState } from "react";
import { ConfirmCustomTimeModal } from "@/components/messages/confirm-custom-time-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { type ChatMessage } from "@/lib/messages/store";

export function CustomTimeActions({
  applicationId,
  customTimeNotes,
  onCounterProposal,
  onConfirmed,
}: {
  applicationId: string;
  customTimeNotes: string | null;
  onCounterProposal: () => void;
  onConfirmed?: (message?: ChatMessage) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-white/20 bg-emerald-50/70 px-4 py-4">
      <p className="ui-kicker">{t("applications.customTime")}</p>
      {customTimeNotes ? (
        <p className="mt-1 text-sm leading-relaxed text-ink">{customTimeNotes}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary w-full">
          {t("applications.finalizeAppointment")}
        </button>
        <button type="button" onClick={onCounterProposal} className="ui-btn-secondary w-full">
          {t("applications.counterProposal")}
        </button>
      </div>
      {open ? (
        <ConfirmCustomTimeModal
          applicationId={applicationId}
          customTimeNotes={customTimeNotes}
          onClose={() => setOpen(false)}
          onConfirmed={onConfirmed}
        />
      ) : null}
    </div>
  );
}
