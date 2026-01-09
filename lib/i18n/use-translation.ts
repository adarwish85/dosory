"use client";

import { useCallback, useMemo } from "react";
import { useOrganizationSettings } from "../hooks/use-organization-settings";

// Import translation files
import en from "./locales/en.json";
import ar from "./locales/ar.json";

// Type for supported locales
export type SupportedLocale = "en" | "ar";

// Translation dictionary type
type TranslationDictionary = typeof en;

// All available translations
const translations: Record<SupportedLocale, TranslationDictionary> = {
    en,
    ar,
};

// Locale metadata
export const LOCALE_METADATA: Record<SupportedLocale, { name: string; nativeName: string; direction: "ltr" | "rtl" }> =
    {
        en: { name: "English", nativeName: "English", direction: "ltr" },
        ar: { name: "Arabic", nativeName: "العربية", direction: "rtl" },
    };

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue(obj, "invoices.status.paid")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
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
 * Hook to access translations based on organization settings.
 * Uses the `defaultLanguage` from org settings.
 *
 * @example
 * const { t, locale, dir } = useTranslation();
 * return <h1>{t("invoices.title")}</h1>;
 */
export function useTranslation() {
    const { settings, loading } = useOrganizationSettings();

    // Get current locale from settings, fallback to "en"
    const locale = useMemo((): SupportedLocale => {
        const lang = settings.defaultLanguage?.toLowerCase();
        if (lang && lang in translations) {
            return lang as SupportedLocale;
        }
        return "en";
    }, [settings.defaultLanguage]);

    // Get text direction for current locale
    const dir = useMemo(() => {
        return LOCALE_METADATA[locale]?.direction || "ltr";
    }, [locale]);

    // Translation function
    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            // Get translation from current locale
            const translation = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);

            if (translation) {
                return interpolate(translation, params);
            }

            // Fallback to English if not found in current locale
            if (locale !== "en") {
                const fallback = getNestedValue(translations.en as unknown as Record<string, unknown>, key);
                if (fallback) {
                    return interpolate(fallback, params);
                }
            }

            // Return key if no translation found
            console.warn(`Translation not found for key: ${key}`);
            return key;
        },
        [locale]
    );

    return {
        t,
        locale,
        dir,
        loading,
        isRTL: dir === "rtl",
    };
}

/**
 * Get all available locales
 */
export function getAvailableLocales() {
    return Object.entries(LOCALE_METADATA).map(([code, meta]) => ({
        code: code as SupportedLocale,
        ...meta,
    }));
}
