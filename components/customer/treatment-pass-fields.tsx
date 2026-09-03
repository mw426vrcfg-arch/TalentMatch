"use client";

import { useEffect, useState } from "react";
import { choiceChipClass } from "@/components/hair/choice-chip";
import { HAIR_THICKNESS, type TreatmentPass } from "@/lib/customer/treatment-pass";

export function TreatmentPassFields({ pass }: { pass?: TreatmentPass | null }) {
  const [thickness, setThickness] = useState(pass?.hair_thickness ?? "");

  useEffect(() => {
    setThickness(pass?.hair_thickness ?? "");
  }, [pass?.hair_thickness]);

  return (
    <div className="space-y-4 rounded-[22px] border border-white/30 bg-white/55 p-4">
      <div>
        <p className="text-sm font-medium text-ink">Digitaler Behandlungs-Pass</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Deine chemische Historie. Salons sehen sie nur, wenn du dich bewirbst — sie schützt dein Haar
          vor falschen Behandlungen.
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Letzte Blondierung</span>
        <input
          name="last_bleaching"
          defaultValue={pass?.last_bleaching ?? ""}
          placeholder="z. B. März 2026 oder noch nie"
          className="ui-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">Chemische Behandlungen</span>
        <textarea
          name="chemical_treatments"
          rows={3}
          defaultValue={pass?.chemical_treatments ?? ""}
          placeholder="Coloration, Dauerwelle, Glättung, Keratin…"
          className="ui-input resize-y"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-ink-soft">Haardicke</legend>
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
            <span className={choiceChipClass(thickness === "")}>Keine Angabe</span>
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
                <span className={choiceChipClass(active)}>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
