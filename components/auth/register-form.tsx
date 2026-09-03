"use client";

import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = {};

type Role = "customer" | "business";

export function RegisterForm({
  initialRole = "customer",
  referredBy = "",
}: {
  initialRole?: Role;
  referredBy?: string;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  const roleCard = (active: boolean) =>
    active ? "ui-choice-card-active" : "ui-choice-card";

  return (
    <form action={formAction} className="space-y-7">
      {state.error && <p className="ui-alert-error">{state.error}</p>}

      {state.success && <p className="ui-alert-ok">{state.success}</p>}

      <div>
        <p className="mb-2 text-sm text-ink-soft">Ich registriere mich als</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("customer")}
            disabled={Boolean(referredBy)}
            className={`${roleCard(role === "customer")} ${
              referredBy ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <span className={`block text-sm font-medium ${role === "customer" ? "text-white" : "text-ink"}`}>Kunde</span>
            <span className={`mt-1 block text-xs leading-relaxed ${role === "customer" ? "text-white/70" : "text-ink-soft"}`}>
              Deals finden und bewerben
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole("business")}
            className={roleCard(role === "business")}
          >
            <span className={`block text-sm font-medium ${role === "business" ? "text-white" : "text-ink"}`}>Salon</span>
            <span className={`mt-1 block text-xs leading-relaxed ${role === "business" ? "text-white/70" : "text-ink-soft"}`}>
              {referredBy ? "Kapazitäten anbieten · Einladung eines Salons" : "Kapazitäten anbieten"}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Vollständiger Name</span>
          <input required name="full_name" autoComplete="name" className="ui-input" />
        </label>

        {role === "business" && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">Salonname</span>
              <input required name="business_name" className="ui-input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">Standort</span>
              <input required name="location" placeholder="z. B. Zürich" className="ui-input" />
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
            className="ui-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Telefon (optional)</span>
          <input type="tel" name="phone" autoComplete="tel" className="ui-input" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">Passwort</span>
          <input
            required
            type="password"
            name="password"
            minLength={8}
            autoComplete="new-password"
            className="ui-input"
          />
        </label>
      </div>

      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Konto wird erstellt…" : "Registrieren"}
      </button>

      {/* Stehen am Ende, sonst erzeugt space-y über dem ersten Block einen leeren Abstand. */}
      <input type="hidden" name="role" value={role} />
      {referredBy ? <input type="hidden" name="ref" value={referredBy} /> : null}
    </form>
  );
}
