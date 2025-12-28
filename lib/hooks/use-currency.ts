"use client";

import { useCallback } from "react";
import { useOrganizationSettings } from "./use-organization-settings";

// Currency code to locale mapping for proper formatting
const currencyLocales: Record<string, string> = {
    USD: "en-US",
    EGP: "en-EG",
    EUR: "de-DE",
    GBP: "en-GB",
    SAR: "ar-SA",
    AED: "ar-AE",
    INR: "en-IN",
    CAD: "en-CA",
    AUD: "en-AU",
    JPY: "ja-JP",
    CNY: "zh-CN",
    CHF: "de-CH",
    // Add more as needed
};

/**
 * Hook that provides currency formatting using organization settings.
 * Automatically uses the org's default currency.
 */
export function useCurrency() {
    const { settings, loading } = useOrganizationSettings();
    const currency = settings.currency || "USD";
    const locale = currencyLocales[currency] || "en-US";

    /**
     * Format a number as currency using org settings.
     */
    const formatCurrency = useCallback(
        (amount: number, overrideCurrency?: string): string => {
            const curr = overrideCurrency || currency;
            const loc = currencyLocales[curr] || locale;

            return new Intl.NumberFormat(loc, {
                style: "currency",
                currency: curr,
            }).format(amount);
        },
        [currency, locale]
    );

    /**
     * Get the currency symbol (e.g., "$", "£", "E£")
     */
    const getCurrencySymbol = useCallback(
        (overrideCurrency?: string): string => {
            const curr = overrideCurrency || currency;
            const loc = currencyLocales[curr] || locale;

            return new Intl.NumberFormat(loc, {
                style: "currency",
                currency: curr,
            })
                .formatToParts(0)
                .find((part) => part.type === "currency")?.value || curr;
        },
        [currency, locale]
    );

    return {
        currency,
        locale,
        loading,
        formatCurrency,
        getCurrencySymbol,
    };
}
