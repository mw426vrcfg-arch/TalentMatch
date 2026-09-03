"use client";

import { useActionState } from "react";
import { toggleBlacklistAction, type BlacklistState } from "@/app/business/blacklist-actions";

const initial: BlacklistState = {};

export function BlockCustomerButton({
  customerId,
  initialBlocked = false,
}: {
  customerId: string;
  initialBlocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(toggleBlacklistAction, initial);
  const blocked = state.blocked ?? initialBlocked;

  return (
    <div className="space-y-1.5">
      {state.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <form
        action={formAction}
        onSubmit={(event) => {
          if (blocked) {
            return;
          }
          if (
            !window.confirm(
              "Dieses Modell für deinen Salon sperren? Es sieht deine Angebote danach nicht mehr. Andere Salons sind nicht betroffen.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="customer_id" value={customerId} />
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-secondary px-3 text-xs"
        >
          {pending
            ? "Wird gespeichert…"
            : blocked
              ? "Sperre aufheben"
              : "Für meinen Salon sperren"}
        </button>
      </form>
    </div>
  );
}
