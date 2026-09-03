"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const callbackError = searchParams.get("error");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  const callbackMessage =
    callbackError === "strikes"
      ? "Dein Konto ist gesperrt. Du hast 3 aktive Strikes wegen No-Shows und kannst dich nicht mehr anmelden."
      : callbackError
        ? "Die Anmeldung konnte nicht bestätigt werden."
        : "";

  return (
    <form action={formAction} className="space-y-7">
      {(state.error || callbackError) && (
        <p className="ui-alert-error">{state.error || callbackMessage}</p>
      )}

      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">E-Mail</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="ui-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Passwort</span>
          <input
            required
            type="password"
            name="password"
            autoComplete="current-password"
            className="ui-input"
          />
        </label>
      </div>

      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Wird angemeldet…" : "Anmelden"}
      </button>

      {/* Steht am Ende, sonst erzeugt space-y über dem ersten Feld einen leeren Abstand. */}
      <input type="hidden" name="next" value={next} />
    </form>
  );
}
