"use client";

import { useLead } from "./lead-context";
import { Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Score calculation
function calculateLeadScore(lead: any): number {
    let score = 0;
    if (lead?.email) score += 15;
    if (lead?.phone) score += 15;
    if (lead?.company) score += 10;
    if (lead?.position) score += 5;
    if (lead?.website) score += 5;
    if (lead?.address?.country) score += 5;
    if (lead?.address?.city) score += 5;
    if (lead?.value && lead.value > 0) score += 15;
    if (lead?.source) score += 10;
    if (lead?.tags?.length > 0) score += 5;
    if (lead?.status === "qualified" || lead?.status === "proposal" || lead?.status === "negotiation") score += 10;
    return Math.min(score, 100);
}

const STATUS_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];

export function LeadOverview() {
    const { lead, loading } = useLead();

    if (loading) return <div className="p-8">Loading overview...</div>;
    if (!lead) return <div className="p-8">Lead not found</div>;

    const score = calculateLeadScore(lead);
    const statusIndex = STATUS_ORDER.indexOf(lead.status || "new");
    const pipelineProgress = statusIndex >= 0 ? ((statusIndex + 1) / STATUS_ORDER.length) * 100 : 0;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold">Overview</h2>

            {/* Top Section: Score & Pipeline Visuals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Score Card */}
                <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3 mb-4">
                        <Target className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold">Lead Score</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-5xl font-bold text-blue-600">{score}</div>
                        <div className="flex-1">
                            <Progress value={score} className="h-3" />
                            <p className="text-sm text-gray-500 mt-2">
                                {score >= 80 ? "Hot Lead - Ready for conversion" :
                                    score >= 60 ? "Warm Lead - Good potential" :
                                        score >= 40 ? "Developing - Needs nurturing" :
                                            "Cold Lead - More info needed"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pipeline Progress Card */}
                <div className="p-6 border rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                        <h3 className="text-lg font-semibold">Conversion Pipeline</h3>
                    </div>
                    <Progress value={pipelineProgress} className="h-3 mb-4" />
                    <div className="flex justify-between">
                        {STATUS_ORDER.map((status, idx) => {
                            const isActive = lead.status === status;
                            const isPassed = statusIndex > idx;
                            return (
                                <div key={status} className={`text-xs font-medium ${isActive ? "text-green-600" : isPassed ? "text-gray-600" : "text-gray-400"}`}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Score Breakdown */}
            <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div className="flex flex-col gap-1"><span>Email</span><Badge variant={lead.email ? "default" : "secondary"}>{lead.email ? "+15" : "0"}</Badge></div>
                    <div className="flex flex-col gap-1"><span>Phone</span><Badge variant={lead.phone ? "default" : "secondary"}>{lead.phone ? "+15" : "0"}</Badge></div>
                    <div className="flex flex-col gap-1"><span>Company</span><Badge variant={lead.company ? "default" : "secondary"}>{lead.company ? "+10" : "0"}</Badge></div>
                    <div className="flex flex-col gap-1"><span>Value</span><Badge variant={lead.value ? "default" : "secondary"}>{lead.value ? "+15" : "0"}</Badge></div>
                    <div className="flex flex-col gap-1"><span>Source</span><Badge variant={lead.source ? "default" : "secondary"}>{lead.source ? "+10" : "0"}</Badge></div>
                    <div className="flex flex-col gap-1"><span>Status</span><Badge variant={["qualified", "proposal", "negotiation"].includes(lead.status || "") ? "default" : "secondary"}>{["qualified", "proposal", "negotiation"].includes(lead.status || "") ? "+10" : "0"}</Badge></div>
                </div>
            </div>
        </div>
    );
}
