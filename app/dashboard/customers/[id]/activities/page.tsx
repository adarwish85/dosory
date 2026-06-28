"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { ActivitiesTable } from "@/components/dashboard/activities/activities-table";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function CustomerActivitiesPage() {
    const { t } = useTranslation();
    const { loading, customerId } = useCustomer();

    if (loading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("customers.activities.loading")}
            </div>
        );
    }

    if (!customerId) {
        return <div className="p-8 text-gray-500">{t("customers.activities.notFound")}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("customers.activities.title")}</h1>
            </div>
            <ActivitiesTable relatedToType="customer" relatedToId={customerId} />
        </div>
    );
}
