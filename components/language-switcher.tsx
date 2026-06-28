"use client";

import { Globe, Check } from "lucide-react";
import { useLanguage, getAvailableLocales } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Visible language switcher (English / العربية). Updates the app-wide locale via the
 * LanguageProvider, which persists the choice and flips the layout to RTL for Arabic.
 */
export function LanguageSwitcher({
    variant = "ghost",
    className = "",
}: {
    variant?: "ghost" | "outline";
    className?: string;
}) {
    const { locale, setLocale } = useLanguage();
    const locales = getAvailableLocales();
    const current = locales.find((l) => l.code === locale);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size="sm" className={`gap-2 ${className}`} aria-label="Change language">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">{current?.nativeName ?? "English"}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {locales.map((l) => (
                    <DropdownMenuItem
                        key={l.code}
                        onClick={() => setLocale(l.code)}
                        className="flex items-center justify-between gap-6"
                    >
                        <span>{l.nativeName}</span>
                        {l.code === locale && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
