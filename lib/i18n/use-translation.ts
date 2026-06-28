"use client";

import { useCallback } from "react";

// Import translation files
import en from "./locales/en.json";
import ar from "./locales/ar.json";

import { SupportedLocale, LOCALE_METADATA } from "./config";
import { useLanguage } from "./language-provider";

// Re-export for backwards compatibility (these used to live in this file).
export type { SupportedLocale } from "./config";
export { LOCALE_METADATA } from "./config";

// Translation dictionary type
type TranslationDictionary = typeof en;

// All available translations
const translations: Record<SupportedLocale, TranslationDictionary> = {
    en,
    ar,
};

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue(obj, "invoices.status.paid")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
    // Exact flat-key match first — module keys added by the i18n migration are stored flat
    // (e.g. "customers.list.title") so many translators can merge into one file safely.
    const direct = obj[path];
    if (typeof direct === "string") return direct;

    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== "object") {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return typeof current === "string" ? current : undefined;
}

/**
 * Interpolate variables in a translation string
 * e.g., interpolate("Hello {name}", { name: "John" }) => "Hello John"
 */
function interpolate(str: string, params?: Record<string, string | number>): string {
    if (!params) return str;

    return str.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key]?.toString() ?? `{${key}}`;
    });
}

/**
 * Hook to access translations. The active locale comes from the LanguageProvider
 * (saved choice > browser language > default) and is shared app-wide, so switching
 * the language updates every component instantly.
 *
 * @example
 * const { t, locale, dir } = useTranslation();
 * return <h1>{t("invoices.title")}</h1>;
 */
export function useTranslation() {
    const { locale, dir } = useLanguage();

    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            // Current locale
            const translation = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
            if (translation) {
                return interpolate(translation, params);
            }

            // Fallback to English
            if (locale !== "en") {
                const fallback = getNestedValue(translations.en as unknown as Record<string, unknown>, key);
                if (fallback) {
                    return interpolate(fallback, params);
                }
            }

            // Return the key itself if nothing matched
            if (process.env.NODE_ENV !== "production") {
                console.warn(`Translation not found for key: ${key}`);
            }
            return key;
        },
        [locale]
    );

    return {
        t,
        locale,
        dir,
        loading: false,
        isRTL: dir === "rtl",
    };
}

/**
 * Get all available locales (for a language switcher).
 */
export function getAvailableLocales() {
    return Object.entries(LOCALE_METADATA).map(([code, meta]) => ({
        code: code as SupportedLocale,
        ...meta,
    }));
}
