"use client";

import { useActionState, useState } from "react";
import { registerAction } from "@/app/auth/actions";
import { type AuthState } from "@/lib/auth/auth-state";
import { PasswordField } from "@/components/auth/password-field";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";

const initialState: AuthState = {};

type Role = "customer" | "business";

export function RegisterForm({
  initialRole = "customer",
  referredBy = "",
}: {
  initialRole?: Role;
  referredBy?: string;
}) {
  const t = useT();
  const localize = useLocalize();
  const [role, setRole] = useState<Role>(initialRole);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState("");
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  const roleCard = (active: boolean) =>
    active ? "ui-choice-card-active" : "ui-choice-card";

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (password !== confirm) {
          event.preventDefault();
          setMismatch(t("auth.passwordsMismatch"));
        }
      }}
      className="space-y-7"
    >
      {(state.error || mismatch) && (
        <p className="ui-alert-error">{mismatch || localize(state.error ?? "")}</p>
      )}

      {state.success && <p className="ui-alert-ok">{localize(state.success)}</p>}

      <div>
        <p className="mb-2 text-sm text-ink-soft">{t("auth.registerAs")}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("customer")}
            disabled={Boolean(referredBy)}
            className={`${roleCard(role === "customer")} ${
              referredBy ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <span className={`block text-sm font-medium ${role === "customer" ? "text-white" : "text-ink"}`}>
              {t("auth.customer")}
            </span>
            <span className={`mt-1 block text-xs leading-relaxed ${role === "customer" ? "text-white/70" : "text-ink-soft"}`}>
              {t("auth.customerHint")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole("business")}
            className={roleCard(role === "business")}
          >
            <span className={`block text-sm font-medium ${role === "business" ? "text-white" : "text-ink"}`}>
              {t("auth.salon")}
            </span>
            <span className={`mt-1 block text-xs leading-relaxed ${role === "business" ? "text-white/70" : "text-ink-soft"}`}>
              {t("auth.salonHint")}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.fullName")}</span>
          <input required name="full_name" autoComplete="name" className="ui-input" />
        </label>

        {role === "business" && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.salonName")}</span>
              <input required name="business_name" className="ui-input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.location")}</span>
              <input required name="location" placeholder={t("auth.locationPlaceholder")} className="ui-input" />
            </label>
          </>
        )}

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

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t("auth.phone")}</span>
          <input type="tel" name="phone" autoComplete="tel" className="ui-input" />
        </label>

        <PasswordField
          required
          name="password"
          minLength={8}
          autoComplete="new-password"
          label={t("auth.password")}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setMismatch("");
          }}
        />
        <PasswordField
          required
          name="password_confirm"
          minLength={8}
          autoComplete="new-password"
          label={t("auth.confirmPassword")}
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            setMismatch("");
          }}
        />
      </div>

      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? t("auth.creatingAccount") : t("auth.register")}
      </button>

      {/* Stehen am Ende, sonst erzeugt space-y über dem ersten Block einen leeren Abstand. */}
      <input type="hidden" name="role" value={role} />
      {referredBy ? <input type="hidden" name="ref" value={referredBy} /> : null}
    </form>
  );
}
