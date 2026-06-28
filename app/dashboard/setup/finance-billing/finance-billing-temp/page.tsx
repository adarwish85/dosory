"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const SECTIONS = [
    { labelKey: "setup.financeIndex.chartOfAccounts", href: "/dashboard/setup/finance-billing/chart-of-accounts" },
    { labelKey: "setup.financeIndex.currencies", href: "/dashboard/setup/finance-billing/currencies" },
    { labelKey: "setup.financeIndex.paymentModes", href: "/dashboard/setup/finance-billing/payment-modes" },
    { labelKey: "setup.financeIndex.taxRates", href: "/dashboard/setup/finance-billing/tax-rates" },
    { labelKey: "setup.financeIndex.expensesCategories", href: "/dashboard/setup/finance-billing/expenses-categories" },
];

export default function SetupFinancePage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <PageHeader title={t("setup.financeIndex.title")} />
            <div className="grid gap-4 mt-6">
                {SECTIONS.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <span className="font-medium text-gray-900">{t(section.labelKey)}</span>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
