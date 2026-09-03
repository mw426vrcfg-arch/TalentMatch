export const HAIR_STRUCTURE = [
  { value: "glatt", label: "Glatt" },
  { value: "wellig", label: "Wellig" },
  { value: "lockig", label: "Lockig" },
] as const;

export const HAIR_LENGTH = [
  { value: "kurz", label: "Kurz" },
  { value: "mittellang", label: "Mittellang" },
  { value: "lang", label: "Lang" },
] as const;

export const HAIR_CHEMICAL = [
  { value: "natur", label: "Natur" },
  { value: "gefaerbt", label: "Gefärbt" },
  { value: "blondiert", label: "Blondiert" },
] as const;

export type HairProfile = {
  structure: string | null;
  length: string | null;
  chemical: string | null;
};

const ALLOWED: Record<keyof HairProfile, Set<string>> = {
  structure: new Set(HAIR_STRUCTURE.map((item) => item.value)),
  length: new Set(HAIR_LENGTH.map((item) => item.value)),
  chemical: new Set(HAIR_CHEMICAL.map((item) => item.value)),
};

const HAIR_OPTIONS: Record<keyof HairProfile, readonly { value: string; label: string }[]> = {
  structure: HAIR_STRUCTURE,
  length: HAIR_LENGTH,
  chemical: HAIR_CHEMICAL,
};

function foldHairToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/[^a-z]/g, "");
}

export function normalizeHairValue(
  kind: keyof typeof ALLOWED,
  value: string | null | undefined,
) {
  const next = String(value ?? "").trim().toLowerCase();
  if (!next) {
    return null;
  }
  if (ALLOWED[kind].has(next)) {
    return next;
  }

  const folded = foldHairToken(next);
  const match = HAIR_OPTIONS[kind].find(
    (option) => foldHairToken(option.value) === folded || foldHairToken(option.label) === folded,
  );
  return match?.value ?? null;
}

export function readHairProfile(source: {
  hair_structure?: string | null;
  hair_length?: string | null;
  hair_chemical?: string | null;
  wanted_hair_structure?: string | null;
  wanted_hair_length?: string | null;
  wanted_hair_chemical?: string | null;
}): HairProfile {
  return {
    structure: normalizeHairValue("structure", source.hair_structure ?? source.wanted_hair_structure),
    length: normalizeHairValue("length", source.hair_length ?? source.wanted_hair_length),
    chemical: normalizeHairValue("chemical", source.hair_chemical ?? source.wanted_hair_chemical),
  };
}

export function hairLabel(kind: keyof HairProfile, value: string | null | undefined) {
  const normalized = normalizeHairValue(kind, value);
  return HAIR_OPTIONS[kind].find((option) => option.value === normalized)?.label ?? null;
}

export function isPerfectHairMatch(customer: HairProfile, wanted: HairProfile) {
  const checks: (keyof HairProfile)[] = ["structure", "length", "chemical"];
  const required = checks.filter((key) => Boolean(wanted[key]));
  if (required.length === 0) {
    return false;
  }
  return required.every((key) => customer[key] && customer[key] === wanted[key]);
}
