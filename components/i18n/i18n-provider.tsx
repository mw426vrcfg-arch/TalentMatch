"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  htmlLang,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { localizeText, translate, type MessageKey } from "@/lib/i18n/messages";
import { hapticTap } from "@/lib/ui/haptic";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  localize: (text: string | null | undefined) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode can block storage.
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = htmlLang(locale);
}

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored) {
      setLocaleState(stored);
      persistLocale(stored);
      return;
    }
    persistLocale(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    hapticTap("light");
  }, []);

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values),
    [locale],
  );

  const localize = useCallback(
    (text: string | null | undefined) => (text ? localizeText(locale, text) : ""),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, localize }), [locale, setLocale, t, localize]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function useT() {
  return useI18n().t;
}

export function useLocalize() {
  return useI18n().localize;
}

export function useLocale() {
  return useI18n().locale;
}
