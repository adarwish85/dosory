"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { ReportKpi } from "@/lib/types/reports";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface KpiCardsProps {
    kpis: Record<string, ReportKpi>;
}

export function KpiCards({ kpis }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(kpis).map(([key, kpi]) => (
                <KpiCard key={key} kpi={kpi} />
            ))}
        </div>
    );
}

function KpiCard({ kpi }: { kpi: ReportKpi }) {
    const isCurrency = kpi.prefix === "$";
    const formattedValue = isCurrency ? formatCurrency(kpi.value) : formatNumber(kpi.value);

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                        <span className="text-2xl font-bold">
                            {kpi.prefix && !isCurrency && kpi.prefix}
                            {formattedValue}
                            {kpi.suffix}
                        </span>
                    </div>
                    {kpi.trend && (
                        <div
                            className={`
                            flex items-center text-xs font-medium rounded-full px-2 py-1
                            ${
                                kpi.trend === "up"
                                    ? "bg-green-100 text-green-700"
                                    : kpi.trend === "down"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-700"
                            }
                        `}
                        >
                            {kpi.trend === "up" && <ArrowUp className="h-3 w-3 mr-1" />}
                            {kpi.trend === "down" && <ArrowDown className="h-3 w-3 mr-1" />}
                            {kpi.trend === "neutral" && <Minus className="h-3 w-3 mr-1" />}
                            {kpi.change ? `${Math.abs(kpi.change)}%` : "-"}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
