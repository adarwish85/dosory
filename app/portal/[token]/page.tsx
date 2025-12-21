"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { usePublicProposal } from "@/lib/hooks/use-public-proposal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    FileText, Calendar, DollarSign, CheckCircle, XCircle,
    Clock, AlertTriangle, Building2, Mail, ShieldAlert
} from "lucide-react";

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window

function checkRateLimit(): { allowed: boolean; remaining: number } {
    if (typeof window === 'undefined') return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS };

    const now = Date.now();
    const storageKey = 'portal_rate_limit';
    const stored = sessionStorage.getItem(storageKey);

    let requests: number[] = stored ? JSON.parse(stored) : [];

    // Filter to only requests within the time window
    requests = requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);

    if (requests.length >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0 };
    }

    // Add current request
    requests.push(now);
    sessionStorage.setItem(storageKey, JSON.stringify(requests));

    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - requests.length };
}

export default function PublicProposalPage() {
    const params = useParams();
    const token = params.token as string;
    const [rateLimited, setRateLimited] = useState(false);
    const { proposal, loading, error, acceptProposal, declineProposal } = usePublicProposal(token);
    const [showDeclineForm, setShowDeclineForm] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Check rate limit on mount
    useEffect(() => {
        const { allowed } = checkRateLimit();
        if (!allowed) {
            setRateLimited(true);
        }
    }, []);

    // Rate limit exceeded screen
    if (rateLimited) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Too Many Requests</h1>
                        <p className="text-gray-600">You've exceeded the rate limit. Please wait a minute before trying again.</p>
                        <Button
                            className="mt-4"
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleAccept = async () => {
        setActionLoading(true);
        setActionMessage(null);
        const result = await acceptProposal();
        setActionLoading(false);

        if (result.success) {
            setActionMessage({ type: "success", text: "Proposal accepted successfully!" });
        } else {
            setActionMessage({ type: "error", text: result.error || "Failed to accept" });
        }
    };

    const handleDecline = async () => {
        setActionLoading(true);
        setActionMessage(null);
        const result = await declineProposal(declineReason);
        setActionLoading(false);

        if (result.success) {
            setActionMessage({ type: "success", text: "Proposal declined" });
            setShowDeclineForm(false);
        } else {
            setActionMessage({ type: "error", text: result.error || "Failed to decline" });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading proposal...</p>
                </div>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Proposal Not Found</h1>
                        <p className="text-gray-600">{error || "This proposal may have been removed or the link is invalid."}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getStatusBadge = () => {
        switch (proposal.status) {
            case "accepted":
                return (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle className="h-4 w-4" />
                        Accepted
                    </div>
                );
            case "declined":
                return (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                        <XCircle className="h-4 w-4" />
                        Declined
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        <Clock className="h-4 w-4" />
                        Pending Review
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                                <FileText className="h-4 w-4" />
                                Proposal #{proposal.number}
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">{proposal.subject}</h1>
                        </div>
                        {getStatusBadge()}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {proposal.customerName}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {proposal.customerEmail}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Valid until: {new Date(proposal.openTill).toLocaleDateString()}
                            {proposal.expired && <span className="text-red-500 ml-1">(Expired)</span>}
                        </div>
                    </div>
                </div>

                {/* Action Message */}
                {actionMessage && (
                    <div className={`rounded-lg p-4 mb-6 ${actionMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                        }`}>
                        {actionMessage.text}
                    </div>
                )}

                {/* Expired Warning */}
                {proposal.expired && proposal.status !== "accepted" && proposal.status !== "declined" && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div>
                            <p className="font-medium text-yellow-800">This proposal has expired</p>
                            <p className="text-sm text-yellow-700">Please contact us to discuss extending this proposal.</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                {proposal.content && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Proposal Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: proposal.content }} />
                        </CardContent>
                    </Card>
                )}

                {/* Line Items */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Pricing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 text-gray-600">Description</th>
                                    <th className="text-right py-2 text-gray-600">Qty</th>
                                    <th className="text-right py-2 text-gray-600">Rate</th>
                                    <th className="text-right py-2 text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposal.items?.map((item, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="py-3">{item.description}</td>
                                        <td className="text-right py-3">{item.quantity}</td>
                                        <td className="text-right py-3">${item.rate.toFixed(2)}</td>
                                        <td className="text-right py-3">${item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right py-4 font-bold">Total</td>
                                    <td className="text-right py-4 font-bold text-lg">
                                        ${proposal.total.toFixed(2)} {proposal.currency}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </CardContent>
                </Card>

                {/* Actions */}
                {proposal.status !== "accepted" && proposal.status !== "declined" && !proposal.expired && (
                    <Card>
                        <CardContent className="p-6">
                            {showDeclineForm ? (
                                <div className="space-y-4">
                                    <h3 className="font-medium">Reason for declining (optional)</h3>
                                    <Textarea
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        placeholder="Please let us know why you're declining..."
                                        rows={3}
                                    />
                                    <div className="flex gap-3">
                                        <Button
                                            variant="destructive"
                                            onClick={handleDecline}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? "Declining..." : "Confirm Decline"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeclineForm(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button
                                        size="lg"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={handleAccept}
                                        disabled={actionLoading}
                                    >
                                        <CheckCircle className="mr-2 h-5 w-5" />
                                        {actionLoading ? "Processing..." : "Accept Proposal"}
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowDeclineForm(true)}
                                    >
                                        <XCircle className="mr-2 h-5 w-5" />
                                        Decline
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm mt-8">
                    <p>Questions? Contact us at support@example.com</p>
                </div>
            </div>
        </div>
    );
}
