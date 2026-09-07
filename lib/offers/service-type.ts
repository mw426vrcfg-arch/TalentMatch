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

/** Hashtag nur bei belastbarem Service-Text, sonst leer. */
export function offerServiceTag(serviceType: string | null | undefined, title: string) {
  const fromStore = (serviceType ?? "").replace(/^#+/, "").trim();
  const fromTitle = inferServiceType(title).replace(/^#+/, "").trim();
  const label = fromStore && !/^other$/i.test(fromStore) ? fromStore : fromTitle;
  if (!label || /^other$/i.test(label)) {
    return "";
  }
  return `#${label}`;
}
