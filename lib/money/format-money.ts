/**
 * THE money formatter. `currency` is REQUIRED and has no default.
 *
 * WHY THAT MATTERS. Three formatters existed. `useCurrency().formatCurrency(amount)` defaulted to
 * the ORGANISATION's currency whenever a caller omitted one, so changing the org default to EGP
 * relabelled every stored USD invoice as EGP — the amounts never moved, only the symbol, which is
 * the worst shape a money bug can take: it is silent, it is wrong on documents that were already
 * issued, and it is invisible to a single-currency tenant until the day they add a second one.
 *
 * RULED 2026-09-23: money is formatted from the DOCUMENT's own currency. The org default is the
 * default for NEW documents only, never a display source. Making the parameter required is how
 * that rule is enforced at the type level rather than by convention — a caller with no document
 * currency to hand cannot silently fall back, it has to say what it means.
 */

/** Currency -> locale, so figures group and place the symbol the way that currency expects. */
const CURRENCY_LOCALES: Record<string, string> = {
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
};

/** The fallback for a document with no currency stored. Only reached by legacy documents. */
export const FALLBACK_CURRENCY = "USD";

export interface FormatMoneyOptions {
    /** Force the locale (e.g. "ar-EG" in an Arabic UI). Defaults to the currency's own locale. */
    locale?: string;
    /** Render 1200 as "1,200" rather than "1,200.00". Off by default. */
    hideZeroDecimals?: boolean;
}

/**
 * Format an amount in a specific currency.
 *
 * @param amount   the value; a non-finite value formats as zero rather than "NaN"
 * @param currency the DOCUMENT's currency code. Pass the document's own field, not a setting.
 */
export function formatMoney(amount: number, currency: string, options: FormatMoneyOptions = {}): string {
    const value = Number.isFinite(amount) ? amount : 0;
    const code = (currency || FALLBACK_CURRENCY).toUpperCase();
    const locale = options.locale || CURRENCY_LOCALES[code] || "en-US";
    const noDecimals = options.hideZeroDecimals && value % 1 === 0;

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            minimumFractionDigits: noDecimals ? 0 : 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        // An unknown/ill-formed code makes Intl throw. Degrade to "<CODE> 1,234.56" rather than
        // letting a bad currency string take down a whole invoice render.
        const n = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: noDecimals ? 0 : 2,
            maximumFractionDigits: 2,
        }).format(value);
        return `${code} ${n}`;
    }
}

/** The bare symbol for a currency, for use next to an input. Same required-currency rule. */
export function currencySymbol(currency: string, locale?: string): string {
    const code = (currency || FALLBACK_CURRENCY).toUpperCase();
    try {
        return (
            new Intl.NumberFormat(locale || CURRENCY_LOCALES[code] || "en-US", {
                style: "currency",
                currency: code,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            })
                .formatToParts(0)
                .find((p) => p.type === "currency")?.value || code
        );
    } catch {
        return code;
    }
}
