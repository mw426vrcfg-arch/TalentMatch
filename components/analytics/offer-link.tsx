"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";

type OfferLinkProps = ComponentProps<typeof Link> & {
  offerId: string;
};

export function OfferLink({ offerId, onClick, ...props }: OfferLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(ANALYTICS_EVENTS.viewOffer, { offer_id: offerId });
        onClick?.(event);
      }}
    />
  );
}
