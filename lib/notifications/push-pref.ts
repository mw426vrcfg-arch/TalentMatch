export const PUSH_PREF_KEY = "talentmatch.inAppPush";
export const PUSH_PREF_EVENT = "tm-push-pref";

export function readPushEnabled() {
  try {
    return window.localStorage.getItem(PUSH_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writePushEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(PUSH_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // Private mode can block storage.
  }
  window.dispatchEvent(new CustomEvent(PUSH_PREF_EVENT, { detail: enabled }));
}
