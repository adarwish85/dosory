"use client";

import { useTranslation } from "@/lib/i18n";

export default function CurrenciesPage() {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-md border shadow-sm p-12 text-center">
                <p className="text-gray-500">{t("setup.currencies.comingSoon")}</p>
            </div>
        </div>
    );
}
