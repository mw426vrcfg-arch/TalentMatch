"use client";

import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";

export function T({
  k,
  values,
}: {
  k: MessageKey;
  values?: Record<string, string | number>;
}) {
  const t = useT();
  return <>{t(k, values)}</>;
}

export function PageIntro({
  kicker,
  title,
  description,
  className = "mb-10 max-w-2xl",
}: {
  kicker?: MessageKey;
  title: MessageKey;
  description?: MessageKey;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={className}>
      {kicker ? <p className="ui-kicker">{t(kicker)}</p> : null}
      <h1 className={`${kicker ? "mt-3" : ""} font-serif text-4xl text-ink sm:text-5xl`}>{t(title)}</h1>
      {description ? <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t(description)}</p> : null}
    </div>
  );
}
