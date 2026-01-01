"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SECTIONS = [
    { label: "Chart of Accounts", href: "/dashboard/setup/finance/chart-of-accounts" },
    { label: "Currencies", href: "/dashboard/setup/finance/currencies" },
    { label: "Payment Modes", href: "/dashboard/setup/finance/payment-modes" },
    { label: "Tax Rates", href: "/dashboard/setup/finance/tax-rates" },
    { label: "Expenses Categories", href: "/dashboard/setup/finance/expenses-categories" },
];

export default function SetupFinancePage() {
    return (
        <div className="p-6">
            <PageHeader title="Finance Setup" />
            <div className="grid gap-4 mt-6">
                {SECTIONS.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <span className="font-medium text-gray-900">{section.label}</span>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
