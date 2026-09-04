"use client";

import { hasTreatmentPassData, type TreatmentPass } from "@/lib/customer/treatment-pass";
import { type HairProfile } from "@/lib/hair/criteria";
import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="ui-kicker">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{value}</dd>
    </div>
  );
}

export function TreatmentPassCard({
  pass,
  hair,
}: {
  pass: TreatmentPass;
  hair?: HairProfile | null;
}) {
  const t = useT();
  const filled = hasTreatmentPassData(pass);
  const dash = t("common.dash");

  function hairValue(value: string | null | undefined) {
    return value ? t(`hair.${value}` as MessageKey) : dash;
  }

  function thicknessValue(value: string | null | undefined) {
    return value ? t(`pass.${value}` as MessageKey) : dash;
  }

  return (
    <aside className="rounded-[22px] border border-white/30 bg-gradient-to-br from-white/80 via-white/60 to-zinc-100/70 p-4 shadow-[0_12px_32px_rgba(15,15,20,0.05)] backdrop-blur-md sm:p-5">
      <p className="ui-kicker">{t("pass.title")}</p>
      <p className="mt-1.5 font-serif text-xl text-ink">{t("pass.history")}</p>

      {filled ? (
        <dl className="mt-4 space-y-3">
          <Row label={t("pass.lastBleach")} value={pass.last_bleaching || dash} />
          <Row label={t("pass.chemicalTreatments")} value={pass.chemical_treatments || dash} />
          <Row label={t("pass.thickness")} value={thicknessValue(pass.hair_thickness)} />
        </dl>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {t("pass.empty")}
        </p>
      )}

      {hair ? (
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/40 pt-3">
          <Row label={t("hair.structure")} value={hairValue(hair.structure)} />
          <Row label={t("hair.length")} value={hairValue(hair.length)} />
          <Row label={t("pass.pretreatment")} value={hairValue(hair.chemical)} />
        </dl>
      ) : null}
    </aside>
  );
}
