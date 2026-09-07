"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";

export function EmptyExplore({ messageKey }: { messageKey: MessageKey }) {
  const t = useT();
  return (
    <div className="ui-empty py-10 text-center">
      <p className="mx-auto max-w-md text-sm leading-relaxed text-ink">{t(messageKey)}</p>
      <Link href="/offers" className="ui-btn-primary mt-5 inline-flex">
        {t("empty.browseOffers")}
      </Link>
    </div>
  );
}
