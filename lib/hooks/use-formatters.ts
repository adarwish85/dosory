"use client";

import { useOrganizationSettings } from "./use-organization-settings";
import { format as dateFnsFormat } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { useCallback, useMemo } from "react";

/**
 * Date format mapping from PHP-style to date-fns style
 */
const DATE_FORMAT_MAP: Record<string, string> = {
    "d/m/Y": "dd/MM/yyyy",
    "m/d/Y": "MM/dd/yyyy",
    "Y-m-d": "yyyy-MM-dd",
    "d-m-Y": "dd-MM-yyyy",
    "d.m.Y": "dd.MM.yyyy",
    "Y/m/d": "yyyy/MM/dd",
    "M d, Y": "MMM dd, yyyy",
    "d M, Y": "dd MMM, yyyy",
    "F j, Y": "MMMM d, yyyy",
};

const TIME_FORMAT_MAP: Record<string, string> = {
    "12": "hh:mm a",
    "24": "HH:mm",
};

/**
 * Hook that provides formatters using tenant organization settings.
 * All formatting is consistent across the tenant.
 */
export function useFormatters() {
    const { settings, loading } = useOrganizationSettings();

    /**
     * Format a date using the tenant's date format setting.
     */
    const formatDate = useCallback(
        (date: Date | Timestamp | string | number | null | undefined, options?: { includeTime?: boolean }): string => {
            if (!date) return "-";

            try {
                // Convert to Date object
                let dateObj: Date;
                if (date instanceof Timestamp || (date && typeof date === "object" && "toDate" in date)) {
                    dateObj = (date as Timestamp).toDate();
                } else if (date instanceof Date) {
                    dateObj = date;
                } else if (typeof date === "string" || typeof date === "number") {
                    dateObj = new Date(date);
                } else {
                    return "-";
                }

                // Get format from settings
                const dateFormat = DATE_FORMAT_MAP[settings.dateFormat] || "dd/MM/yyyy";
                const timeFormat = TIME_FORMAT_MAP[settings.timeFormat] || "hh:mm a";

                if (options?.includeTime) {
                    return dateFnsFormat(dateObj, `${dateFormat} ${timeFormat}`);
                }

                return dateFnsFormat(dateObj, dateFormat);
            } catch {
                return "-";
            }
        },
        [settings.dateFormat, settings.timeFormat]
    );

    /**
     * Format a currency amount using tenant settings.
     * @param amount - The numeric amount
     * @param currency - Currency code (e.g., "USD", "EUR"). Falls back to customer/default.
     */
    const formatCurrency = useCallback(
        (amount: number = 0, currency: string = "USD"): string => {
            try {
                // Build locale from settings
                const locale = settings.defaultLanguage === "ar" ? "ar-EG" : "en-US";

                // Use Intl.NumberFormat for proper currency formatting
                const formatter = new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: currency.toUpperCase(),
                    minimumFractionDigits: settings.removeDecimalsOnZero && amount % 1 === 0 ? 0 : 2,
                    maximumFractionDigits: 2,
                });

                return formatter.format(amount);
            } catch {
                // Fallback to basic formatting
                return `${currency} ${amount.toFixed(2)}`;
            }
        },
        [settings.defaultLanguage, settings.removeDecimalsOnZero]
    );

    /**
     * Format a number using tenant's decimal/thousand separators.
     */
    const formatNumber = useCallback(
        (value: number, options?: { decimals?: number }): string => {
            try {
                const decimals = options?.decimals ?? 2;
                const parts = value.toFixed(decimals).split(".");

                // Get separators from settings
                let thousandSep: string = settings.thousandSeparator || ",";
                const decimalSep: string = settings.decimalSeparator || ".";

                // Handle special cases
                if (thousandSep === "none") thousandSep = "";
                if (thousandSep === "space") thousandSep = " ";

                // Format integer part with thousand separator
                const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);

                // Handle decimal part
                if (decimals === 0 || (settings.removeDecimalsOnZero && parts[1] === "00")) {
                    return intPart;
                }

                return `${intPart}${decimalSep}${parts[1]}`;
            } catch {
                return value.toString();
            }
        },
        [settings.decimalSeparator, settings.thousandSeparator, settings.removeDecimalsOnZero]
    );

    /**
     * Get the current date format pattern (for input fields, etc.)
     */
    const datePattern = useMemo(() => {
        return DATE_FORMAT_MAP[settings.dateFormat] || "dd/MM/yyyy";
    }, [settings.dateFormat]);

    /**
     * Get timezone from settings
     */
    const timezone = useMemo(() => {
        return settings.timezone || "UTC";
    }, [settings.timezone]);

    return {
        formatDate,
        formatCurrency,
        formatNumber,
        datePattern,
        timezone,
        loading,
        settings, // Expose full settings for advanced use cases
    };
}
