export function safeInternalPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return "";
  }
  if (
    trimmed === "/login" ||
    trimmed === "/register" ||
    trimmed.startsWith("/login?") ||
    trimmed.startsWith("/register?") ||
    trimmed.startsWith("/auth/")
  ) {
    return "";
  }
  return trimmed.slice(0, 512);
}

export function readReturnTo(
  source: { get(name: string): FormDataEntryValue | string | null },
) {
  const redirectTo = String(source.get("redirectTo") ?? "");
  const next = String(source.get("next") ?? "");
  return safeInternalPath(redirectTo) || safeInternalPath(next);
}

export function withReturnTo(href: "/login" | "/register", returnTo?: string) {
  const safe = safeInternalPath(returnTo ?? "");
  if (!safe) {
    return href;
  }
  return `${href}?redirectTo=${encodeURIComponent(safe)}`;
}

export function guestApplyLoginHref(offerId: string) {
  return withReturnTo("/login", `/offers/${offerId}`);
}

export function applyReturnPath(offerId: string, slotId?: string | null) {
  const base = `/offers/${offerId}`;
  if (!slotId) {
    return base;
  }
  return `${base}/apply?slot=${slotId}`;
}
