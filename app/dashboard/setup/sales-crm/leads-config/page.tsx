"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const SECTIONS = [
    { labelKey: "setup.leadsConfig.sources", href: "/dashboard/setup/sales-crm/leads-config/sources" },
    { labelKey: "setup.leadsConfig.statuses", href: "/dashboard/setup/sales-crm/leads-config/statuses" },
    { labelKey: "setup.leadsConfig.webToLead", href: "/dashboard/setup/sales-crm/leads-config/web-to-lead" },
    { labelKey: "setup.leadsConfig.forms", href: "/dashboard/setup/sales-crm/leads-config/forms" },
];

export default function SetupLeadsPage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <PageHeader title={t("setup.leadsConfig.title")} />
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
