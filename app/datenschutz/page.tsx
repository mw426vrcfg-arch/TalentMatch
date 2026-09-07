import type { Metadata } from "next";
import { LegalPrivacy } from "@/components/legal/legal-privacy";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export const revalidate = 60;
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `${translate(DEFAULT_LOCALE, "settings.privacy")} · TalentMatch`,
};

export default function DatenschutzPage() {
  return <LegalPrivacy />;
}
