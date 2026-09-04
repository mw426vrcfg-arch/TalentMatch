"use client";

import { useCallback, useState, type ReactNode } from "react";
import { SalonOfferCard } from "@/components/business/salon-offer-card";
import { FeedbackToast } from "@/components/settings/apple-sheet";
import { useT } from "@/components/i18n/i18n-provider";
import type { SalonOfferListItem } from "@/lib/offers/salon-list";

export function SalonOfferList({
  offers,
  currentUserId,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
  empty,
}: {
  offers: SalonOfferListItem[];
  currentUserId: string;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
  empty: ReactNode;
}) {
  const t = useT();
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [goneIds, setGoneIds] = useState<string[]>([]);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastKey, setToastKey] = useState(0);

  const closeToast = useCallback(() => {
    setToastOpen(false);
  }, []);

  const handleDeleted = useCallback((offerId: string) => {
    setLeavingIds((current) => (current.includes(offerId) ? current : [...current, offerId]));
    window.setTimeout(() => {
      setGoneIds((current) => (current.includes(offerId) ? current : [...current, offerId]));
      setLeavingIds((current) => current.filter((id) => id !== offerId));
      setToastKey((current) => current + 1);
      setToastOpen(true);
    }, 320);
  }, []);

  const visible = offers.filter((offer) => !goneIds.includes(offer.id));

  if (visible.length === 0) {
    return (
      <>
        {toastOpen ? (
          <FeedbackToast key={toastKey} message={t("salon.deleteSuccess")} onClose={closeToast} />
        ) : null}
        <div className="ui-empty">{empty}</div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {toastOpen ? (
        <FeedbackToast key={toastKey} message={t("salon.deleteSuccess")} onClose={closeToast} />
      ) : null}
      {visible.map((offer) => (
        <div key={offer.id} className={leavingIds.includes(offer.id) ? "ui-offer-out" : undefined}>
          <SalonOfferCard
            offer={offer}
            currentUserId={currentUserId}
            urgentLimitReached={urgentLimitReached}
            urgentLimit={urgentLimit}
            urgentUsed={urgentUsed}
            onDeleted={handleDeleted}
          />
        </div>
      ))}
    </div>
  );
}
