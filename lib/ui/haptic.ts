export function hapticTap(kind: "light" | "success" | "cancel" = "light") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  try {
    if (kind === "success") {
      navigator.vibrate([10, 20, 14]);
      return;
    }
    navigator.vibrate(kind === "cancel" ? 8 : 12);
  } catch {
    // Vibration is optional — desktop browsers often ignore it.
  }
}
