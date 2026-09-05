"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/auth/actions";
import { type AuthState } from "@/lib/auth/auth-state";
import { isValidEmail } from "@/lib/auth/credentials";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { PasswordField } from "@/components/auth/password-field";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";

const initialState: AuthState = {};

const ERROR_BANNER =
  "ui-alert-error border-rose/40 bg-[#fff1f0] font-medium text-[#b42318]";

export function LoginForm() {
  const t = useT();
  const localize = useLocalize();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const callbackError = searchParams.get("error");
  const resetDone = searchParams.get("reset") === "1";
  const [forgotOpen, setForgotOpen] = useState(false);
  const [clientError, setClientError] = useState("");
  const [checking, setChecking] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const busy = checking || pending;

  useEffect(() => {
    if (!pending) {
      setChecking(false);
    }
  }, [pending]);

  const callbackMessage =
    callbackError === "strikes"
      ? t("errors.strikesLocked")
      : callbackError
        ? t("errors.loginUnconfirmed")
        : "";

  const banner = clientError || (state.error ? localize(state.error) : callbackMessage);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setChecking(true);
    setClientError("");

    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    if (!isValidEmail(email)) {
      event.preventDefault();
      setClientError(t("errors.invalidEmail"));
      setChecking(false);
    }
  }

  return (
    <form noValidate action={formAction} onSubmit={handleSubmit} className="space-y-7">
      {resetDone && !banner ? <p className="ui-alert-ok">{t("auth.passwordUpdated")}</p> : null}
      {banner ? (
        <p role="alert" className={ERROR_BANNER}>
          {banner}
        </p>
      ) : null}

      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.email")}</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            className="ui-input"
            onChange={() => setClientError("")}
          />
        </label>

        <div>
          <PasswordField
            required
            name="password"
            autoComplete="current-password"
            label={t("auth.password")}
            onChange={() => setClientError("")}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-[13px] text-ink-soft underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />

      <button type="submit" disabled={busy} className="ui-btn-primary w-full">
        {busy ? t("auth.loading") : t("auth.signIn")}
      </button>

      {/* Steht am Ende, sonst erzeugt space-y über dem ersten Feld einen leeren Abstand. */}
      <input type="hidden" name="next" value={next} />
    </form>
  );
}
