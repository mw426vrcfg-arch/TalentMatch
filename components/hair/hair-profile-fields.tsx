"use client";

import { useEffect, useState } from "react";
import { choiceChipClass } from "@/components/hair/choice-chip";
import { HAIR_CHEMICAL, HAIR_LENGTH, HAIR_STRUCTURE, type HairProfile } from "@/lib/hair/criteria";

function TagGroup({
  legend,
  name,
  value,
  onChange,
  options,
  optional,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
  optional?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-ink-soft">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {optional ? (
          <label className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value=""
              checked={value === ""}
              onChange={() => onChange("")}
              className="sr-only"
            />
            <span className={choiceChipClass(value === "")}>Egal</span>
          </label>
        ) : null}
        {options.map((option) => {
          const active = value === option.value;
          return (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={choiceChipClass(active)}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function HairProfileFields({
  profile,
  optional = false,
}: {
  profile?: HairProfile | null;
  optional?: boolean;
}) {
  const [structure, setStructure] = useState(profile?.structure ?? "");
  const [length, setLength] = useState(profile?.length ?? "");
  const [chemical, setChemical] = useState(profile?.chemical ?? "");

  useEffect(() => {
    setStructure(profile?.structure ?? "");
    setLength(profile?.length ?? "");
    setChemical(profile?.chemical ?? "");
  }, [profile?.structure, profile?.length, profile?.chemical]);

  return (
    <div className="space-y-4 rounded-[22px] border border-white/30 bg-white/55 p-4">
      <p className="text-sm font-medium text-ink">
        {optional ? "Wunsch-Kriterien für das Modell (optional)" : "Dein Haarprofil"}
      </p>
      <TagGroup
        legend="Haarstruktur"
        name={optional ? "wanted_hair_structure" : "hair_structure"}
        value={structure}
        onChange={setStructure}
        options={HAIR_STRUCTURE}
        optional={optional}
      />
      <TagGroup
        legend="Haarlänge"
        name={optional ? "wanted_hair_length" : "hair_length"}
        value={length}
        onChange={setLength}
        options={HAIR_LENGTH}
        optional={optional}
      />
      <TagGroup
        legend="Chemische Vorbehandlung"
        name={optional ? "wanted_hair_chemical" : "hair_chemical"}
        value={chemical}
        onChange={setChemical}
        options={HAIR_CHEMICAL}
        optional={optional}
      />
    </div>
  );
}
