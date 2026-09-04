"use client";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { useT } from "@/components/i18n/i18n-provider";

export function LegalAgb() {
  const t = useT();
  return (
    <LegalPage kicker={t("legal.kicker")} title={t("legal.agbTitle")} updated={t("legal.updatedLegal")}>
      <LegalSection title={t("legal.agb.s1")}>
        <p>{t("legal.agb.s1p1")}</p>
        <p>{t("legal.agb.s1p2")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s2")}>
        <p>{t("legal.agb.s2p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s3")}>
        <p>{t("legal.agb.s3p1")}</p>
        <p>{t("legal.agb.s3p2")}</p>
        <p>{t("legal.agb.s3p3")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s4")}>
        <p>{t("legal.agb.s4p1")}</p>
        <p>{t("legal.agb.s4p2")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s5")}>
        <p>{t("legal.agb.s5p1")}</p>
        <p>{t("legal.agb.s5p2")}</p>
        <p>{t("legal.agb.s5p3")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s6")}>
        <p>{t("legal.agb.s6p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s7")}>
        <p>{t("legal.agb.s7p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s8")}>
        <p>{t("legal.agb.s8p1")}</p>
      </LegalSection>
      <LegalSection title={t("legal.agb.s9")}>
        <p>{t("legal.agb.s9p1")}</p>
      </LegalSection>
    </LegalPage>
  );
}
