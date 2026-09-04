"use client";

import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/settings/apple-sheet";
import { useT } from "@/components/i18n/i18n-provider";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        setPending(false);
        return;
      }
      setSent(true);
      setPending(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("auth.resetFailed"));
      setPending(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <Sheet
      title={t("auth.forgotPassword")}
      lockClose={pending}
      onClose={() => {
        if (!pending) {
          onClose();
          setSent(false);
          setError("");
        }
      }}
    >
      {sent ? (
        <p className="ui-alert-ok">{t("auth.resetSent")}</p>
      ) : (
        <form onSubmit={(event) => void sendReset(event)} className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">{t("auth.resetIntro")}</p>
          {error ? <p className="ui-alert-error">{error}</p> : null}
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.resetEmailLabel")}</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="ui-input"
            />
          </label>
          <button type="submit" disabled={pending} className="ui-btn-primary w-full">
            {pending ? t("auth.resetSending") : t("auth.resetSend")}
          </button>
        </form>
      )}
    </Sheet>
  );
}
