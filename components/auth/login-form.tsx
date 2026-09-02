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
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {(state.error || callbackError) && (
        <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {state.error || callbackMessage}
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">E-Mail</span>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Passwort</span>
        <input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-cream transition hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? "Wird angemeldet…" : "Anmelden"}
      </button>
    </form>
  );
}
