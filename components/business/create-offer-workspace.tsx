"use client";

import { useState } from "react";
import { CreateOfferForm } from "@/components/business/create-offer-form";
import { OfferEditorOverlay } from "@/components/business/offer-editor-overlay";
import { hapticTap } from "@/lib/ui/haptic";

export function CreateOfferWorkspace({
  location,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
}: {
  location?: string | null;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          hapticTap("light");
          setOpen(true);
        }}
        className="ui-btn-primary min-h-14 w-full px-8 text-base sm:w-auto"
      >
        + Neues Angebot erstellen
      </button>

      {open ? (
        <OfferEditorOverlay
          kicker="Neues Angebot"
          title="Deal veröffentlichen"
          subtitle={`Location kommt von deinem Salonprofil${location ? ` (${location})` : ""}.`}
          onClose={() => setOpen(false)}
        >
          <CreateOfferForm
            onCancel={() => setOpen(false)}
            urgentLimitReached={urgentLimitReached}
            urgentLimit={urgentLimit}
            urgentUsed={urgentUsed}
          />
        </OfferEditorOverlay>
      ) : null}
    </>
  );
}
