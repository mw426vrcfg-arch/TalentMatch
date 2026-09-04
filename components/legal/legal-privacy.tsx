"use client";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { useT } from "@/components/i18n/i18n-provider";

export function LegalPrivacy() {
  const t = useT();
  return (
    <LegalPage kicker={t("legal.kicker")} title={t("legal.privacyTitle")} updated={t("legal.updatedLegal")}>
      <LegalSection title={t("legal.privacy.s1")}>
        <p>{t("legal.privacy.s1p1")}</p>
        <p>{t("legal.privacy.s1p2")}</p>
        <p>{t("legal.privacy.s1p3")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s2")}>
        <p>{t("legal.privacy.s2p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s3")}>
        <p>{t("legal.privacy.s3p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s4")}>
        <p>{t("legal.privacy.s4p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s5")}>
        <p>{t("legal.privacy.s5p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s6")}>
        <p>{t("legal.privacy.s6p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s7")}>
        <p>{t("legal.privacy.s7p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacy.s8")}>
        <p>{t("legal.privacy.s8p1")}</p>
      </LegalSection>
    </LegalPage>
  );
}
