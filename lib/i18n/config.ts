// Shared i18n constants/types (no React, no "use client") so both the provider and the
// translation hook can import them without a circular dependency.

export type SupportedLocale = "en" | "ar";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "ar"];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_STORAGE_KEY = "dosory.locale";

export const LOCALE_METADATA: Record<SupportedLocale, { name: string; nativeName: string; direction: "ltr" | "rtl" }> =
    {
        en: { name: "English", nativeName: "English", direction: "ltr" },
        ar: { name: "Arabic", nativeName: "العربية", direction: "rtl" },
    };

export function isSupportedLocale(value: unknown): value is SupportedLocale {
    return value === "en" || value === "ar";
}

/** Resolve a locale from a browser language tag (e.g. "ar-EG" -> "ar"). */
export function localeFromLanguageTag(tag: string | undefined | null): SupportedLocale {
    if (!tag) return DEFAULT_LOCALE;
    return tag.toLowerCase().startsWith("ar") ? "ar" : "en";
}
