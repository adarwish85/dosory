"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { defaultYearFilter, yearFilterOptions } from "@/lib/invoices/year-filter-options";
import { summariseInvoices, topGroups, type CurrencyGroup } from "@/lib/money/invoice-summary";
import { formatMoney } from "@/lib/money/format-money";
import { useTranslation } from "@/lib/i18n";

interface InvoiceHeaderProps {
    invoices: Invoice[];
    /** Only where a document with NO currency is grouped. Never a display source. */
    orgDefaultCurrency: string;
}

const TONES = {
    green: "bg-green-50 border-green-100 text-green-600",
    red: "bg-red-50 border-red-100 text-red-600",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-600",
} as const;

/**
 * A chip showing at most two currencies plus a counted overflow. Currencies are never summed
 * together: a figure that adds dollars to pounds is not a quantity of anything, and there is no
 * FX rate source here to convert with honestly.
 */
function SummaryChip({
    label,
    groups,
    noCurrencyCount,
    tone,
}: {
    label: string;
    groups: CurrencyGroup[];
    noCurrencyCount: number;
    tone: keyof typeof TONES;
}) {
    const { t } = useTranslation();
    const { shown, overflowCurrencies } = topGroups(groups);
    return (
        <div className={`px-3 py-1.5 rounded-md border flex flex-col gap-0.5 ${TONES[tone]}`}>
            <span className="text-xs font-medium">{label}</span>
            {shown.length === 0 ? (
                <span className="text-sm font-bold text-gray-400">—</span>
            ) : (
                shown.map((g) => (
                    <span key={g.currency} className="text-sm font-bold text-gray-900">
                        {formatMoney(g.amount, g.currency)}
                    </span>
                ))
            )}
            {(overflowCurrencies > 0 || noCurrencyCount > 0) && (
                <span className="text-[10px] text-gray-500">
                    {[
                        overflowCurrencies > 0
                            ? t("invoices.summary.overflowCurrencies", { count: overflowCurrencies })
                            : null,
                        noCurrencyCount > 0 ? t("invoices.summary.noCurrency", { count: noCurrencyCount }) : null,
                    ]
                        .filter(Boolean)
                        .join(", ")}
                </span>
            )}
        </div>
    );
}

export function InvoiceHeader({ invoices, orgDefaultCurrency }: InvoiceHeaderProps) {
    const { t } = useTranslation();

    // One definition per card, shared with the QuickStatsBar on the same page. These chips and
    // that bar used to compute different things under near-identical words: this component summed
    // amountPaid across everything and called it "Paid Invoices", while the bar summed the total
    // of invoices whose status was "paid". See lib/money/invoice-summary.ts.
    const summary = summariseInvoices(invoices, { orgDefaultCurrency });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <Link
                        href="#"
                        className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                        Recurring Invoices <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                <div className="flex flex-col gap-3 items-end">
                    <div className="flex gap-2">
                        <Select defaultValue="EGP">
                            <SelectTrigger className="w-[80px] h-8 bg-transparent border-none font-semibold text-gray-600 hover:text-gray-900 shadow-none px-0">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EGP">EGP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select defaultValue={String(defaultYearFilter())}>
                            <SelectTrigger className="w-[80px] h-8 bg-transparent border-none font-semibold text-gray-600 hover:text-gray-900 shadow-none px-0">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearFilterOptions().map((year) => (
                                    <SelectItem key={year} value={String(year)}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <SummaryChip
                            label={t("invoices.summary.collected")}
                            groups={summary.collected}
                            noCurrencyCount={summary.noCurrencyCount}
                            tone="green"
                        />
                        <SummaryChip
                            label={t("invoices.summary.overdue")}
                            groups={summary.overdue}
                            noCurrencyCount={summary.noCurrencyCount}
                            tone="red"
                        />
                        <SummaryChip
                            label={t("invoices.summary.outstanding")}
                            groups={summary.outstanding}
                            noCurrencyCount={summary.noCurrencyCount}
                            tone="yellow"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
