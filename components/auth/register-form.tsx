"use client";

import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = {};

type Role = "customer" | "business";

export function RegisterForm() {
  const [role, setRole] = useState<Role>("customer");
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="role" value={role} />

      {state.error && (
        <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          {state.success}
        </p>
      )}

      <div>
        <p className="mb-2 text-sm text-ink-soft">Ich registriere mich als</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              role === "customer"
                ? "border-gold bg-gold/10"
                : "border-ink/10 bg-paper hover:border-gold/50"
            }`}
          >
            <span className="block text-sm font-medium text-ink">Kunde</span>
            <span className="mt-1 block text-xs text-ink-soft">Deals finden und bewerben</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("business")}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              role === "business"
                ? "border-gold bg-gold/10"
                : "border-ink/10 bg-paper hover:border-gold/50"
            }`}
          >
            <span className="block text-sm font-medium text-ink">Salon</span>
            <span className="mt-1 block text-xs text-ink-soft">Kapazitäten anbieten</span>
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Vollständiger Name</span>
        <input
          required
          name="full_name"
          autoComplete="name"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      {role === "business" && (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">Salonname</span>
            <input
              required
              name="business_name"
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">Standort</span>
            <input
              required
              name="location"
              placeholder="z. B. Zürich"
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
            />
          </label>
        </>
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
        <span className="mb-1.5 block text-sm text-ink-soft">Telefon (optional)</span>
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Passwort</span>
        <input
          required
          type="password"
          name="password"
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-ink outline-none transition focus:border-gold"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-cream transition hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? "Konto wird erstellt…" : "Registrieren"}
      </button>
    </form>
  );
}
