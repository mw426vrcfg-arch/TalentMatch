"use client";

import { useLocalize } from "@/components/i18n/i18n-provider";

export function LocalizedText({ text }: { text: string }) {
  const localize = useLocalize();
  return <>{localize(text)}</>;
}
