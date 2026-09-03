"use client";

import { useActionState, useState } from "react";
import { completeOAuthRoleAction, type RoleState } from "@/app/auth/role/actions";

const initialState: RoleState = {};

type Role = "customer" | "business";

export function OAuthRoleDialog({
  initialRole,
  suggestedName,
  provider,
}: {
  initialRole: Role;
  suggestedName: string;
  provider: string;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [state, formAction, pending] = useActionState(completeOAuthRoleAction, initialState);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 px-4 py-6 backdrop-blur-md sm:items-center">
      <div className="animate-app w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 bg-white/85 p-6 shadow-[0_28px_80px_rgba(15,15,20,0.22)] backdrop-blur-xl sm:p-8">
        <p className="ui-kicker text-ink-soft">Fast geschafft</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink">
          Wie möchtest du TalentMatch nutzen?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Angemeldet mit {provider}. Wähle noch deine Rolle — danach geht es direkt los.
        </p>

        <form action={formAction} className="mt-6 space-y-5">
          <input type="hidden" name="role" value={role} />

          {state.error && <p className="ui-alert-error">{state.error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={role === "customer" ? "ui-choice-card-active" : "ui-choice-card"}
            >
              <span className={`block text-sm font-medium ${role === "customer" ? "text-white" : "text-ink"}`}>Kunde</span>
              <span className={`mt-1 block text-xs ${role === "customer" ? "text-white/70" : "text-ink-soft"}`}>Deals finden und bewerben</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("business")}
              className={role === "business" ? "ui-choice-card-active" : "ui-choice-card"}
            >
              <span className={`block text-sm font-medium ${role === "business" ? "text-white" : "text-ink"}`}>Salon</span>
              <span className={`mt-1 block text-xs ${role === "business" ? "text-white/70" : "text-ink-soft"}`}>Kapazitäten anbieten</span>
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">Vollständiger Name</span>
            <input
              required
              name="full_name"
              defaultValue={suggestedName}
              autoComplete="name"
              className="ui-input"
            />
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

          <button
            type="submit"
            disabled={pending}
            className="ui-btn-primary w-full"
          >
            {pending ? "Konto wird eingerichtet…" : "Weiter"}
          </button>
        </form>
      </div>
    </div>
  );
}
