"use client";

import { useLead } from "./lead-context";
import { Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EditDealDialog } from "./edit-deal-dialog";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Briefcase, Calendar as CalendarIcon, DollarSign, GripVertical } from "lucide-react";

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
                                {score >= 80
                                    ? "Hot Lead - Ready for conversion"
                                    : score >= 60
                                        ? "Warm Lead - Good potential"
                                        : score >= 40
                                            ? "Developing - Needs nurturing"
                                            : "Cold Lead - More info needed"}
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
                                <div
                                    key={status}
                                    className={`text-xs font-medium ${isActive ? "text-green-600" : isPassed ? "text-gray-600" : "text-gray-400"}`}
                                >
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
                    <div className="flex flex-col gap-1">
                        <span>Email</span>
                        <Badge variant={lead.email ? "default" : "secondary"}>{lead.email ? "+15" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Phone</span>
                        <Badge variant={lead.phone ? "default" : "secondary"}>{lead.phone ? "+15" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Company</span>
                        <Badge variant={lead.company ? "default" : "secondary"}>{lead.company ? "+10" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Value</span>
                        <Badge variant={lead.value ? "default" : "secondary"}>{lead.value ? "+15" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Source</span>
                        <Badge variant={lead.source ? "default" : "secondary"}>{lead.source ? "+10" : "0"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Status</span>
                        <Badge
                            variant={
                                ["qualified", "proposal", "negotiation"].includes(lead.status || "")
                                    ? "default"
                                    : "secondary"
                            }
                        >
                            {["qualified", "proposal", "negotiation"].includes(lead.status || "") ? "+10" : "0"}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>

            {/* Deal Details Section */ }
    <div className="p-6 border rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <Briefcase className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-semibold">Deal Details</h3>
            </div>
            <EditDealDialog
                lead={lead}
                trigger={
                    <Button variant="outline" size="sm">
                        {lead.deal ? "Edit Deal" : "Add Deal Details"}
                    </Button>
                }
            />
        </div>

        {lead.deal ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-gray-50 rounded-md border">
                        <div className="text-sm text-gray-500 mb-1">Subject</div>
                        <div className="font-medium text-lg">{lead.deal.subject}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-md border">
                        <div className="text-sm text-gray-500 mb-1">Value</div>
                        <div className="font-medium text-lg flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                            {lead.deal.value?.toLocaleString()}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-md border">
                        <div className="text-sm text-gray-500 mb-1">Expected Close</div>
                        <div className="font-medium text-lg flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                            {lead.deal.expectedCloseDate
                                ? format(lead.deal.expectedCloseDate instanceof Timestamp
                                    ? lead.deal.expectedCloseDate.toDate()
                                    : lead.deal.expectedCloseDate, "PPP")
                                : "Not set"}
                        </div>
                    </div>
                </div>

                {lead.deal.description && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">
                            {lead.deal.description}
                        </p>
                    </div>
                )}

                {lead.deal.products && lead.deal.products.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Products / Services</h4>
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="py-2 px-3 text-left font-medium text-gray-500">Item</th>
                                        <th className="py-2 px-3 text-right font-medium text-gray-500">Qty</th>
                                        <th className="py-2 px-3 text-right font-medium text-gray-500">Rate</th>
                                        <th className="py-2 px-3 text-right font-medium text-gray-500">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {lead.deal.products.map((item, idx) => (
                                        <tr key={idx} className="bg-white">
                                            <td className="py-2 px-3">{item.description}</td>
                                            <td className="py-2 px-3 text-right">{item.quantity}</td>
                                            <td className="py-2 px-3 text-right">{item.rate?.toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right font-medium">{item.amount?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center py-8 bg-gray-50 rounded-md border border-dashed">
                <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900">No deal details yet</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                    Add deal information like value, products, and expected close date.
                </p>
                <EditDealDialog
                    lead={lead}
                    trigger={
                        <Button size="sm">Add Deal Details</Button>
                    }
                />
            </div>
        )}
    </div>
        </div >
    );
}
