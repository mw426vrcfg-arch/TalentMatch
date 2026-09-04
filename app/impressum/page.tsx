import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LegalImpressum } from "@/components/legal/legal-impressum";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { title: `${translate(locale, "settings.impressum")} · TalentMatch` };
}

export default function ImpressumPage() {
  return <LegalImpressum />;
}
