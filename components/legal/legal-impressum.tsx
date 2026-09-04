"use client";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { useT } from "@/components/i18n/i18n-provider";

export function LegalImpressum() {
  const t = useT();
  return (
    <LegalPage kicker={t("legal.kicker")} title={t("legal.impressumTitle")} updated={t("legal.updated")}>
      <LegalSection title={t("legal.impressum.provider")}>
        <p>{t("legal.impressum.company")}</p>
        <p>{t("legal.impressum.legalForm")}</p>
        <p>{t("legal.impressum.street")}</p>
        <p>{t("legal.impressum.city")}</p>
      </LegalSection>
      <LegalSection title={t("legal.impressum.contact")}>
        <p>{t("legal.impressum.email")}</p>
        <p>{t("legal.impressum.phone")}</p>
      </LegalSection>
      <LegalSection title={t("legal.impressum.representative")}>
        <p>{t("legal.impressum.representativeBody")}</p>
      </LegalSection>
      <LegalSection title={t("legal.impressum.register")}>
        <p>{t("legal.impressum.registerOffice")}</p>
        <p>{t("legal.impressum.uid")}</p>
      </LegalSection>
      <LegalSection title={t("legal.impressum.liability")}>
        <p>{t("legal.impressum.liabilityBody")}</p>
      </LegalSection>
    </LegalPage>
  );
}
