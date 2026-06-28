"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useEstimates } from "@/lib/hooks/use-sales";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { EstimateStatus } from "@/lib/types";
import { CreateEstimateDialog } from "@/components/dashboard/sales/create-estimate-dialog";
import { useTranslation } from "@/lib/i18n";

const statusColors: Record<EstimateStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    viewed: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    accepted: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    declined: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    expired: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
};

export default function LeadEstimatesPage() {
    const params = useParams();
    const leadId = params?.id as string;
    const { estimates, loading } = useEstimates({ leadId });
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatCurrency = (amount: number, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
        }).format(amount);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            // Check if toDate exists (Firestore Timestamp)
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t("leads.estimates.title")}</h2>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("leads.estimates.createEstimate")}
                </Button>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">{t("leads.estimates.table.number")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.estimates.table.amount")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.estimates.table.date")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.estimates.table.expiry")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.estimates.table.status")}</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {estimates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText className="h-8 w-8 text-gray-300" />
                                        <p>{t("leads.estimates.empty")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            estimates.map((est) => {
                                const colors = statusColors[est.status] || statusColors.draft;
                                return (
                                    <TableRow key={est.id} className="group hover:bg-gray-50">
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/dashboard/sales/estimates/${est.id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {est.number}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{formatCurrency(est.total || 0, est.currency)}</TableCell>
                                        <TableCell className="text-gray-500">{formatDate(est.date)}</TableCell>
                                        <TableCell className="text-gray-500">{formatDate(est.expiryDate)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                                                {t(`leads.estimates.status.${est.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/dashboard/sales/estimates/${est.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{t("leads.estimates.view")}</span>
                                                    <FileText className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateEstimateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} leadId={leadId} />
        </div>
    );
}
