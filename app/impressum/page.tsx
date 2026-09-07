import type { Metadata } from "next";
import { LegalImpressum } from "@/components/legal/legal-impressum";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export const revalidate = 60;
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `${translate(DEFAULT_LOCALE, "settings.impressum")} · TalentMatch`,
};

export default function ImpressumPage() {
  return <LegalImpressum />;
}
