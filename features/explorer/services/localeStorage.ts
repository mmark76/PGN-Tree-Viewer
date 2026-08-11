import { DEFAULT_LOCALE } from "../i18n";
import type { Locale } from "../i18n";

export const LOCALE_STORAGE_KEY = "chesstree-locale-v1";

export function normalizeLocale(value: unknown): Locale {
  return value === "el" || value === "en" ? value : DEFAULT_LOCALE;
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function storeLocale(locale: Locale) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale));
  } catch {
    // Language switching still works when browser storage is unavailable.
  }
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = normalizeLocale(locale);
}
