export type TreatmentPass = {
  last_bleaching: string | null;
  chemical_treatments: string | null;
  hair_thickness: string | null;
};

export const HAIR_THICKNESS = [
  { value: "fein", label: "Fein" },
  { value: "mittel", label: "Mittel" },
  { value: "dick", label: "Dick" },
] as const;

export const EMPTY_TREATMENT_PASS: TreatmentPass = {
  last_bleaching: null,
  chemical_treatments: null,
  hair_thickness: null,
};

function foldThickness(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

export function normalizeThickness(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    return null;
  }
  const folded = foldThickness(raw);
  const match = HAIR_THICKNESS.find(
    (option) => option.value === raw || foldThickness(option.value) === folded || foldThickness(option.label) === folded,
  );
  return match?.value ?? null;
}

export function thicknessLabel(value: string | null | undefined) {
  const normalized = normalizeThickness(value);
  return HAIR_THICKNESS.find((option) => option.value === normalized)?.label ?? null;
}

export function readTreatmentPass(row: Record<string, unknown> | null | undefined): TreatmentPass {
  if (!row) {
    return { ...EMPTY_TREATMENT_PASS };
  }

  const text = (key: string) => {
    const value = row[key];
    if (value == null) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
  };

  return {
    last_bleaching: text("last_bleaching") ?? text("last_bleach") ?? text("bleaching"),
    chemical_treatments: text("chemical_treatments") ?? text("treatments") ?? text("hair_history"),
    hair_thickness: normalizeThickness(text("hair_thickness") ?? text("thickness") ?? text("hair_density")),
  };
}

export function hasTreatmentPassData(pass: TreatmentPass | null | undefined) {
  if (!pass) {
    return false;
  }
  return Boolean(pass.last_bleaching || pass.chemical_treatments || pass.hair_thickness);
}
