"use client";

import { useLeads } from "@/lib/hooks/use-leads";
import { useTranslation } from "@/lib/i18n";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface PipelineWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

const PIPELINE_STAGES = [
    { key: "new", labelKey: "dashboard.pipeline.stage.new", color: "bg-gray-400" },
    { key: "contacted", labelKey: "dashboard.pipeline.stage.contacted", color: "bg-blue-400" },
    { key: "qualified", labelKey: "dashboard.pipeline.stage.qualified", color: "bg-purple-400" },
    { key: "offer-sent", labelKey: "dashboard.pipeline.stage.offerSent", color: "bg-amber-400" },
    { key: "won", labelKey: "dashboard.pipeline.stage.won", color: "bg-green-500" },
];

export function PipelineWidget({ settings, density }: PipelineWidgetProps) {
    const { t } = useTranslation();
    const { leads, leadStats } = useLeads();

    // Safely get stage counts
    const getCount = (key: string) => {
        const stats = leadStats as Record<string, number> | undefined;
        return stats?.[key] || 0;
    };

    // Calculate stage counts
    const stageCounts = PIPELINE_STAGES.map((stage) => ({
        ...stage,
        count: getCount(stage.key),
    }));

    const totalLeads = leads.length || 1;
    const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
    const wonCount = getCount("won");

    return (
        <div className="h-full flex flex-col">
            {/* Funnel Visualization */}
            <div className="flex-1 flex flex-col justify-center gap-2">
                {stageCounts.map((stage, index) => {
                    const widthPercent = Math.max(20, (stage.count / maxCount) * 100);
                    return (
                        <div key={stage.key} className="flex items-center gap-3">
                            <div className="w-20 text-xs text-gray-500 text-right">{t(stage.labelKey)}</div>
                            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${stage.color} rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                                    style={{ width: `${widthPercent}%` }}
                                >
                                    <span className="text-xs font-medium text-white">{stage.count}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{getCount("total")}</div>
                    <div className="text-xs text-gray-500">{t("dashboard.pipeline.total")}</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{wonCount}</div>
                    <div className="text-xs text-gray-500">{t("dashboard.pipeline.won")}</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                        {totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0}%
                    </div>
                    <div className="text-xs text-gray-500">{t("dashboard.pipeline.winRate")}</div>
                </div>
            </div>
        </div>
    );
}
