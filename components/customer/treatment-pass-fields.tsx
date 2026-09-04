"use client";

import { useEffect, useState } from "react";
import { choiceChipClass } from "@/components/hair/choice-chip";
import { useT } from "@/components/i18n/i18n-provider";
import { HAIR_THICKNESS, type TreatmentPass } from "@/lib/customer/treatment-pass";
import { type MessageKey } from "@/lib/i18n/messages";

export function TreatmentPassFields({ pass }: { pass?: TreatmentPass | null }) {
  const t = useT();
  const [thickness, setThickness] = useState(pass?.hair_thickness ?? "");

  useEffect(() => {
    setThickness(pass?.hair_thickness ?? "");
  }, [pass?.hair_thickness]);

  return (
    <div className="space-y-4 rounded-[22px] border border-white/30 bg-white/55 p-4">
      <div>
        <p className="text-sm font-medium text-ink">{t("pass.title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          {t("pass.thicknessHint")}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("pass.lastBleach")}</span>
        <input
          name="last_bleaching"
          defaultValue={pass?.last_bleaching ?? ""}
          placeholder={t("pass.lastBleachPlaceholder")}
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{t("pass.chemicalTreatments")}</span>
        <textarea
          name="chemical_treatments"
          rows={3}
          defaultValue={pass?.chemical_treatments ?? ""}
          placeholder={t("pass.chemicalPlaceholder")}
          className="ui-input resize-y"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-ink-soft">{t("pass.thickness")}</legend>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="hair_thickness"
              value=""
              checked={thickness === ""}
              onChange={() => setThickness("")}
              className="sr-only"
            />
            <span className={choiceChipClass(thickness === "")}>{t("pass.none")}</span>
          </label>
          {HAIR_THICKNESS.map((option) => {
            const active = thickness === option.value;
            return (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="hair_thickness"
                  value={option.value}
                  checked={active}
                  onChange={() => setThickness(option.value)}
                  className="sr-only"
                />
                <span className={choiceChipClass(active)}>{t(`pass.${option.value}` as MessageKey)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
