"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { acceptCustomTimeAction } from "@/app/business/review-actions";
import { Sheet } from "@/components/settings/apple-sheet";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { BusyLabel } from "@/components/ui/busy-label";
import { type ChatMessage } from "@/lib/messages/store";

function isNextControlFlowError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const digest = String((error as { digest?: unknown }).digest);
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function zurichDateTimeLocal(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  let hour = read("hour");
  if (hour === 24) {
    hour = 0;
  }
  return `${read("year")}-${pad(read("month"))}-${pad(read("day"))}T${pad(hour)}:${pad(read("minute"))}`;
}

export function ConfirmCustomTimeModal({
  applicationId,
  customTimeNotes,
  onClose,
  onConfirmed,
}: {
  applicationId: string;
  customTimeNotes: string | null;
  onClose: () => void;
  onConfirmed?: (message?: ChatMessage) => void;
}) {
  const t = useT();
  const localize = useLocalize();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minValue = zurichDateTimeLocal();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setError(null);

    try {
      const result = await acceptCustomTimeAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onConfirmed?.(result.confirmMessage);
      onClose();
      router.refresh();
    } catch (submitError) {
      if (isNextControlFlowError(submitError)) {
        throw submitError;
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("applications.finalizeFailed"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet title={t("applications.finalizeTitle")} onClose={onClose} lockClose={pending}>
      <p className="text-sm leading-relaxed text-ink-soft">{t("applications.finalizeIntro")}</p>
      <div className="mt-4 rounded-2xl border border-white/40 bg-white/70 px-3 py-3">
        <p className="ui-kicker">{t("applications.customTime")}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink">
          {customTimeNotes?.trim() || t("common.none")}
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <input type="hidden" name="application_id" value={applicationId} />
        {error ? <p className="ui-alert-error">{localize(error)}</p> : null}
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("applications.confirmExactTime")}</span>
          <input
            required
            type="datetime-local"
            name="confirmed_start"
            min={minValue}
            step="60"
            className="ui-input [color-scheme:light]"
          />
        </label>
        <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary w-full">
          {pending ? <BusyLabel>{t("actions.saving")}</BusyLabel> : t("actions.save")}
        </button>
      </form>
    </Sheet>
  );
}
