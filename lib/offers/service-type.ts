export function inferServiceType(title: string) {
  const value = title.toLowerCase();

  if (value.includes("balayage")) return "Balayage";
  if (value.includes("color") || value.includes("färb") || value.includes("blond")) {
    return "Coloring";
  }
  if (
    value.includes("cut") ||
    value.includes("schnitt") ||
    value.includes("haircut")
  ) {
    return "Haircut";
  }

  return "Other";
}
