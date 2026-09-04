import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LegalPrivacy } from "@/components/legal/legal-privacy";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { title: `${translate(locale, "settings.privacy")} · TalentMatch` };
}

export default function DatenschutzPage() {
  return <LegalPrivacy />;
}
