export const LOCALES = ["de", "en", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_STORAGE_KEY = "talentmatch.locale";
export const LOCALE_COOKIE = "tm_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "de" || value === "en" || value === "fr";
}

export function parseLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function intlLocale(locale: Locale) {
  if (locale === "en") {
    return "en-CH";
  }
  if (locale === "fr") {
    return "fr-CH";
  }
  return "de-CH";
}

export function localeLabel(locale: Locale) {
  if (locale === "en") {
    return "English";
  }
  if (locale === "fr") {
    return "Français";
  }
  return "Deutsch";
}

export function localeShort(locale: Locale) {
  return locale.toUpperCase();
}

export const LOCALE_SWITCH_ORDER: Locale[] = ["de", "fr", "en"];

export function htmlLang(locale: Locale) {
  return locale;
}
