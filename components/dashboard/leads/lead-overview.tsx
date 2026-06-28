"use client";

import { useLead } from "./lead-context";
import { Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateLeadScore, calculateDealValue, getScoreDescription } from "@/lib/utils/lead-score";
import { useTranslation } from "@/lib/i18n";

const STATUS_ORDER = ["new", "contacted", "qualified", "offer-sent", "negotiation", "won"];

export function LeadOverview() {
    const { lead, loading } = useLead();
    const { t } = useTranslation();

    if (loading) return <div className="p-8">{t("leads.overview.loading")}</div>;
    if (!lead) return <div className="p-8">{t("leads.notFound")}</div>;

    const score = calculateLeadScore(lead);
    const dealValue = calculateDealValue(lead);
    const statusIndex = STATUS_ORDER.indexOf(lead.status || "new");
    const pipelineProgress = statusIndex >= 0 ? ((statusIndex + 1) / STATUS_ORDER.length) * 100 : 0;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold">{t("leads.overview.title")}</h2>

            {/* Top Section: Score & Pipeline Visuals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Score Card */}
                <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3 mb-4">
                        <Target className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold">{t("leads.overview.leadScore")}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-5xl font-bold text-blue-600">{score}</div>
                        <div className="flex-1">
                            <Progress value={score} className="h-3" />
                            <p className="text-sm text-gray-500 mt-2">{getScoreDescription(score)}</p>
                        </div>
                    </div>
                </div>

                {/* Pipeline Progress Card */}
                <div className="p-6 border rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                        <h3 className="text-lg font-semibold">{t("leads.overview.conversionPipeline")}</h3>
                    </div>
                    <Progress value={pipelineProgress} className="h-3 mb-4" />
                    <div className="grid grid-cols-6 gap-1">
                        {STATUS_ORDER.map((status, idx) => {
                            const isActive = lead.status === status;
                            const isPassed = statusIndex > idx;
                            return (
                                <div
                                    key={status}
                                    className={`text-[10px] md:text-xs font-medium text-center truncate px-0.5 ${isActive ? "text-green-600 font-bold" : isPassed ? "text-gray-600" : "text-gray-400"}`}
                                    title={t(`leads.status.${status}`)}
                                >
                                    {t(`leads.status.${status}`)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Deal Summary Card */}
            {lead.deal && (
                <div className="p-6 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">💼 {t("leads.overview.dealSummary")}</h3>
                        <Badge variant="outline" className="bg-white">
                            {lead.deal.subject || t("leads.overview.unnamedDeal")}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-500">{t("leads.overview.dealValue")}</div>
                            <div className="text-2xl font-bold text-green-600">${dealValue.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">{t("leads.overview.productsServices")}</div>
                            <div className="text-2xl font-bold text-gray-900">{lead.deal.products?.length || 0}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Score Breakdown */}
            <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{t("leads.overview.scoreBreakdown")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div className="flex flex-col gap-1">
                        <span>{t("common.email")}</span>
                        <Badge variant={lead.email ? "default" : "secondary"}>{lead.email ? "+15" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>{t("common.phone")}</span>
                        <Badge variant={lead.phone ? "default" : "secondary"}>{lead.phone ? "+15" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>{t("leads.fields.company")}</span>
                        <Badge variant={lead.company ? "default" : "secondary"}>{lead.company ? "+10" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>{t("leads.overview.dealValue")}</span>
                        <Badge variant={dealValue > 0 ? "default" : "secondary"}>
                            {dealValue > 0
                                ? `+${15 + (dealValue >= 10000 ? 5 : 0) + (dealValue >= 50000 ? 5 : 0)}`
                                : "0"}
                        </Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>{t("leads.fields.source")}</span>
                        <Badge variant={lead.source ? "default" : "secondary"}>{lead.source ? "+10" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>{t("common.status")}</span>
                        <Badge
                            variant={
                                ["qualified", "offer-sent", "negotiation"].includes(lead.status || "")
                                    ? "default"
                                    : "secondary"
                            }
                        >
                            {["qualified", "offer-sent", "negotiation"].includes(lead.status || "") ? "+10" : "0"}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}
