"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { useTranslation } from "@/lib/i18n";

export default function SetupContractsPage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <PageHeader title={t("setup.contracts.title")} />
            <div className="mt-6 p-4 bg-white border rounded-lg">
                <p className="text-gray-500">{t("setup.contracts.placeholder")}</p>
            </div>
        </div>
    );
}
