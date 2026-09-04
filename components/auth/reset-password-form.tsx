"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/password-field";
import { useT } from "@/components/i18n/i18n-provider";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    async function prepareSession() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(t("auth.resetInvalid"));
          return;
        }
        window.history.replaceState(null, "", "/reset-password");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError(t("auth.resetInvalid"));
        return;
      }
      setReady(true);
    }

    void prepareSession();
  }, [t]);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("errors.passwordLength"));
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(t("auth.passwordUpdated"));
    window.setTimeout(() => {
      router.replace("/login?reset=1");
    }, 1200);
  }

  return (
    <form onSubmit={(event) => void savePassword(event)} className="space-y-7">
      {error ? <p className="ui-alert-error">{error}</p> : null}
      {success ? <p className="ui-alert-ok">{success}</p> : null}

      <div className="space-y-5">
        <PasswordField
          required
          name="password"
          minLength={8}
          autoComplete="new-password"
          label={t("auth.newPassword")}
          value={password}
          disabled={!ready || pending}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          required
          name="password_confirm"
          minLength={8}
          autoComplete="new-password"
          label={t("auth.confirmPassword")}
          value={confirm}
          disabled={!ready || pending}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>

      <button type="submit" disabled={!ready || pending} className="ui-btn-primary w-full">
        {pending ? t("auth.savingPassword") : t("auth.savePassword")}
      </button>
    </form>
  );
}
