"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Database, Activity, Lock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function UtilitiesPage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <PageHeader title={t("utilities.title")} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            {t("utilities.databaseBackup.title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{t("utilities.databaseBackup.description")}</p>
                        <Button variant="outline" className="w-full">
                            {t("utilities.databaseBackup.action")}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            {t("utilities.systemStatus.title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{t("utilities.systemStatus.description")}</p>
                        <Button variant="outline" className="w-full">
                            {t("utilities.systemStatus.action")}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            {t("utilities.securityAudit.title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t("utilities.securityAudit.description")}
                        </p>
                        <Button variant="outline" className="w-full">
                            {t("utilities.securityAudit.action")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
