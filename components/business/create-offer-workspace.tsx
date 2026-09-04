"use client";

import { useState } from "react";
import { CreateOfferForm } from "@/components/business/create-offer-form";
import { OfferEditorOverlay } from "@/components/business/offer-editor-overlay";
import { useT } from "@/components/i18n/i18n-provider";
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
  const t = useT();
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
        {t("create.ctaCreate")}
      </button>

      {open ? (
        <OfferEditorOverlay
          kicker={t("create.newOffer")}
          title={t("create.publishDeal")}
          subtitle={t("create.locationFromProfile", {
            location: location ? t("create.locationParen", { location }) : "",
          })}
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
