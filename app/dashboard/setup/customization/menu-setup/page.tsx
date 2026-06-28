"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const SECTIONS = [
    { labelKey: "setup.mainMenu.title", href: "/dashboard/setup/customization/menu-setup/main-menu" },
    { labelKey: "setup.setupMenu.title", href: "/dashboard/setup/customization/menu-setup/setup-menu" },
];

export default function SetupMenuSetupPage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <PageHeader title={t("setup.menuSetup.title")} />
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
