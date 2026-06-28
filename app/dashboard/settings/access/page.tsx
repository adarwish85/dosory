"use client";

import { RoleManager } from "@/components/settings/rbac/RoleManager";
import { useTranslation } from "@/lib/i18n";

export default function AccessControlPage() {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("settings.access.title")}</h2>
                <p className="text-muted-foreground">{t("settings.access.description")}</p>
            </div>

            <RoleManager />
        </div>
    );
}
