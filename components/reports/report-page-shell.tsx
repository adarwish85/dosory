"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ReportPageShellProps {
    title: string;
    description?: string;
    children: ReactNode;
    onRefresh?: () => void;
    onExport?: () => void;
    dateRange?: string;
    onDateRangeChange?: (value: string) => void;
    canExport?: boolean;
    loading?: boolean;
}

export function ReportPageShell({
    title,
    description,
    children,
    onRefresh,
    onExport,
    dateRange = "month",
    onDateRangeChange,
    canExport = false,
    loading = false,
}: ReportPageShellProps) {
    const { t } = useTranslation();
    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {description && <p className="text-muted-foreground mt-1">{description}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onDateRangeChange && (
                        <Select value={dateRange} onValueChange={onDateRangeChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("reports.shell.selectRange")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">{t("reports.shell.range.today")}</SelectItem>
                                <SelectItem value="week">{t("reports.shell.range.week")}</SelectItem>
                                <SelectItem value="month">{t("reports.shell.range.month")}</SelectItem>
                                <SelectItem value="quarter">{t("reports.shell.range.quarter")}</SelectItem>
                                <SelectItem value="year">{t("reports.shell.range.year")}</SelectItem>
                                <SelectItem value="all">{t("reports.shell.range.all")}</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    {onRefresh && (
                        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    )}

                    {onExport && canExport && (
                        <Button variant="outline" onClick={onExport} disabled={loading}>
                            <Download className="mr-2 h-4 w-4" />
                            {t("common.export")}
                        </Button>
                    )}
                </div>
            </div>

            <div className={`space-y-6 ${loading ? "opacity-60 pointer-events-none" : ""}`}>{children}</div>
        </div>
    );
}
