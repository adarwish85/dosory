import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency code to locale mapping
const currencyLocales: Record<string, string> = {
  USD: "en-US",
  EGP: "en-EG",
  EUR: "en-DE",
  GBP: "en-GB",
  SAR: "ar-SA",
  AED: "ar-AE",
  INR: "en-IN",
  // Add more as needed
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const locale = currencyLocales[currency] || "en-US"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatDate(date: Date | string | number, dateFormat: string = "d/m/Y"): string {
  const d = new Date(date)
  // Map common format strings to Intl options
  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    "d/m/Y": { day: "2-digit", month: "2-digit", year: "numeric" },
    "m/d/Y": { month: "2-digit", day: "2-digit", year: "numeric" },
    "Y-m-d": { year: "numeric", month: "2-digit", day: "2-digit" },
    "d M, Y": { day: "numeric", month: "short", year: "numeric" },
    "M d, Y": { month: "short", day: "numeric", year: "numeric" },
  }
  const options = formats[dateFormat] || formats["d/m/Y"]
  return new Intl.DateTimeFormat("en-GB", options).format(d)
}
