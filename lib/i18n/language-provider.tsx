"use client";

import { createContext, useContext, useCallback, useEffect, useSyncExternalStore } from "react";
import {
    SupportedLocale,
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    LOCALE_METADATA,
    isSupportedLocale,
    localeFromLanguageTag,
} from "./config";

// --- External locale store (localStorage-backed) ---------------------------------------
// Read via useSyncExternalStore so it's hydration-safe (server renders DEFAULT_LOCALE, the
// client reconciles to the saved/browser locale) without a setState-in-effect.

let currentLocale: SupportedLocale | null = null; // resolved lazily, client-side
const listeners = new Set<() => void>();

function readStoredLocale(): SupportedLocale {
    try {
        const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (isSupportedLocale(saved)) return saved;
    } catch {
        /* ignore */
    }
    return localeFromLanguageTag(typeof navigator !== "undefined" ? navigator.language : undefined);
}

function getSnapshot(): SupportedLocale {
    if (currentLocale === null) currentLocale = readStoredLocale();
    return currentLocale;
}

function getServerSnapshot(): SupportedLocale {
    return DEFAULT_LOCALE;
}

function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

function writeStoredLocale(locale: SupportedLocale): void {
    currentLocale = locale;
    try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        /* ignore */
    }
    listeners.forEach((cb) => cb());
}

// --- Context ---------------------------------------------------------------------------

interface LanguageContextValue {
    locale: SupportedLocale;
    setLocale: (locale: SupportedLocale) => void;
    dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const dir = LOCALE_METADATA[locale].direction;

    // Keep <html lang/dir> in sync (the pre-paint inline script sets it first to avoid flash).
    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = dir;
    }, [locale, dir]);

    const setLocale = useCallback((next: SupportedLocale) => writeStoredLocale(next), []);

    return <LanguageContext.Provider value={{ locale, setLocale, dir }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        // Defensive fallback if used outside the provider (provider lives in the root layout).
        return { locale: DEFAULT_LOCALE, setLocale: () => {}, dir: "ltr" };
    }
    return ctx;
}
