"use client";

import { useState } from "react";
import { CreateOfferForm } from "@/components/business/create-offer-form";
import { OfferEditorOverlay } from "@/components/business/offer-editor-overlay";
import { isOwnSalonOffer } from "@/lib/offers/ownership";
import { type SalonOfferListItem } from "@/lib/offers/salon-list";
import { hapticTap } from "@/lib/ui/haptic";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.2 5.2 18.8 8.8M4 20l3.1-.6c.3 0 .5-.2.7-.4L19.6 7.2a1.6 1.6 0 0 0 0-2.3L19 4.4a1.6 1.6 0 0 0-2.3 0L5 16.1c-.2.2-.3.5-.4.7L4 20Z"
      />
    </svg>
  );
}

export function EditOfferButton({
  offer,
  currentUserId,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
}: {
  offer: SalonOfferListItem;
  currentUserId: string;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
}) {
  const [open, setOpen] = useState(false);

  if (!isOwnSalonOffer(offer, currentUserId) || offer.salon_id !== currentUserId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          hapticTap("light");
          setOpen(true);
        }}
        className="ui-icon-btn"
        aria-label={`Angebot ${offer.title} bearbeiten`}
      >
        <PencilIcon />
      </button>
      {open ? (
        <OfferEditorOverlay
          kicker="Angebot bearbeiten"
          title="Deal anpassen"
          subtitle="Titel, Preise, Bild und neue Slots — nur für deinen Salon."
          onClose={() => setOpen(false)}
        >
          <CreateOfferForm
            offer={offer}
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
