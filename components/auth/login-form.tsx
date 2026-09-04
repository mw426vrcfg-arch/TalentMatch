"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthState } from "@/app/auth/actions";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { PasswordField } from "@/components/auth/password-field";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";

const initialState: AuthState = {};

export function LoginForm() {
  const t = useT();
  const localize = useLocalize();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const callbackError = searchParams.get("error");
  const resetDone = searchParams.get("reset") === "1";
  const [forgotOpen, setForgotOpen] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  const callbackMessage =
    callbackError === "strikes"
      ? t("errors.strikesLocked")
      : callbackError
        ? t("errors.loginUnconfirmed")
        : "";

  return (
    <form action={formAction} className="space-y-7">
      {resetDone && !state.error && !callbackError ? (
        <p className="ui-alert-ok">{t("auth.passwordUpdated")}</p>
      ) : null}
      {(state.error || callbackError) && (
        <p className="ui-alert-error">{state.error ? localize(state.error) : callbackMessage}</p>
      )}

      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.email")}</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="ui-input"
          />
        </label>

        <div>
          <PasswordField
            required
            name="password"
            autoComplete="current-password"
            label={t("auth.password")}
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

      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      {/* Steht am Ende, sonst erzeugt space-y über dem ersten Feld einen leeren Abstand. */}
      <input type="hidden" name="next" value={next} />
    </form>
  );
}
