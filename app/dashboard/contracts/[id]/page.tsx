"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, ChevronDown, Download, Mail, PenLine, Printer, CheckCircle2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useContract, useContracts } from "@/lib/hooks";
import dynamic from "next/dynamic";
import ContractPDF from "@/components/pdf/ContractPDF";
import { ContractStatus } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink), {
    ssr: false,
    loading: () => <span>Loading PDF...</span>,
});

export default function ContractDetailsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { contract, loading, error } = useContract(id);
    const { signContract, updateStatus, deleteContract } = useContracts();
    const [actionLoading, setActionLoading] = useState(false);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">{t("contracts.detail.notFound")}</h2>
                <Button onClick={() => router.push("/dashboard/contracts")}>{t("contracts.detail.backToList")}</Button>
            </div>
        );
    }

    const handleSign = async () => {
        if (!confirm(t("contracts.detail.confirmSign"))) return;
        setActionLoading(true);
        try {
            await signContract(id, { signedBy: "org_user_id" });
            toast.success(t("contracts.toast.signed"));
        } catch (err) {
            console.error("Error signing contract:", err);
            toast.error(t("contracts.toast.signFailed"));
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusChange = async (status: ContractStatus) => {
        setActionLoading(true);
        try {
            await updateStatus(id, status);
            toast.success(t("contracts.toast.statusUpdated", { status }));
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error(t("contracts.toast.statusFailed"));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t("contracts.delete.confirm"))) return;
        setActionLoading(true);
        try {
            await deleteContract(id);
            toast.success(t("contracts.toast.deleted"));
            router.push("/dashboard/contracts");
        } catch (err) {
            console.error("Error deleting contract:", err);
            toast.error(t("contracts.toast.deleteFailed"));
        } finally {
            setActionLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDate = (date: any) => {
        if (!date) return "-";
        try {
            if (date?.toDate) return format(date.toDate(), "PPP");
            if (date instanceof Date) return format(date, "PPP");
            return format(new Date(date), "PPP");
        } catch {
            return "-";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 font-sans space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/dashboard/contracts")}
                        className="gap-2 text-gray-600 hover:text-gray-900 pl-0"
                    >
                        <ArrowLeft className="h-4 w-4" /> {t("contracts.detail.back")}
                    </Button>
                    <div className="h-6 w-px bg-gray-200" />
                    <h1 className="text-xl font-semibold text-gray-900">{contract.subject}</h1>
                    <Badge variant="outline" className="capitalize ml-2">
                        {t(`contracts.status.${contract.status}`)}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/contracts/${id}/edit`)}
                        disabled={actionLoading}
                    >
                        <PenLine className="mr-2 h-4 w-4" /> {t("common.edit")}
                    </Button>

                    {/* PDF Download Button */}
                    <div className="inline-flex">
                        <PDFDownloadLink
                            document={
                                <ContractPDF
                                    contract={{ ...contract, contractValue: contract.contractValue || 0 }}
                                    signedDate={contract.signedAt ? formatDate(contract.signedAt) : undefined}
                                />
                            }
                            fileName={`Contract-${contract.id}.pdf`}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                        >
                            {({ loading: pdfLoading }) =>
                                pdfLoading ? (
                                    <span>{t("common.loading")}</span>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" /> {t("contracts.detail.pdf")}
                                    </>
                                )
                            }
                        </PDFDownloadLink>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => window.print()} disabled={actionLoading}>
                        <Printer className="mr-2 h-4 w-4" /> {t("contracts.detail.print")}
                    </Button>

                    <Button variant="outline" size="sm" disabled={actionLoading}>
                        <Mail className="mr-2 h-4 w-4" /> {t("contracts.detail.send")}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={actionLoading}>
                                {t("contracts.detail.more")} <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange("sent")}>{t("contracts.detail.markSent")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange("signed")}>
                                {t("contracts.detail.markSigned")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> {t("contracts.detail.delete")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {contract.status !== "signed" && (
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleSign}
                            disabled={actionLoading}
                        >
                            {t("contracts.detail.signNow")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (A4 Paper style) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="min-h-[800px] shadow-sm border-gray-200">
                        <CardContent className="p-12 space-y-8">
                            {/* Contract Header on Paper */}
                            <div className="border-b pb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{contract.subject}</h1>
                                <p className="text-gray-500">{t("contracts.detail.contractNumber", { id: contract.id })}</p>
                            </div>

                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                                        {t("contracts.detail.client")}
                                    </h3>
                                    <div className="text-gray-700">
                                        <p className="font-medium text-lg">{contract.customerName}</p>
                                        {/* Address would go here if available */}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                                        {t("contracts.detail.details")}
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{t("contracts.detail.valueLabel")}</span>
                                            <span className="font-medium">
                                                {new Intl.NumberFormat("en-US", {
                                                    style: "currency",
                                                    currency: "USD",
                                                }).format(contract.contractValue || 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{t("contracts.detail.startDateLabel")}</span>
                                            <span className="font-medium">{formatDate(contract.startDate)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{t("contracts.detail.endDateLabel")}</span>
                                            <span className="font-medium">{formatDate(contract.endDate)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="prose prose-sm max-w-none text-gray-700 mt-8">
                                {contract.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: contract.content }} />
                                ) : (
                                    <p className="text-gray-400 italic">{t("contracts.detail.noContent")}</p>
                                )}
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-12 pt-12 mt-12 border-t">
                                <div className="space-y-4">
                                    <div className="h-20 border-b border-gray-300 relative">
                                        {contract.status === "signed" && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-green-600 font-script text-2xl opacity-80 rotate-[-5deg] border-2 border-green-600 px-4 py-1 rounded">
                                                    {t("contracts.detail.signedDigital")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-semibold text-sm">{t("contracts.detail.authorizedSignature")}</p>
                                    <p className="text-xs text-gray-500">{t("contracts.detail.orgRepresentative")}</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-20 border-b border-gray-300 relative">
                                        {contract.status === "signed" && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-green-600 font-script text-2xl opacity-80 rotate-[-5deg] border-2 border-green-600 px-4 py-1 rounded">
                                                    {contract.customerName}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-semibold text-sm">{t("contracts.detail.clientSignature")}</p>
                                    <p className="text-xs text-gray-500">{contract.customerName}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-4">{t("contracts.detail.activity")}</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t("contracts.detail.contractCreated")}</p>
                                        <p className="text-gray-500 text-xs">{formatDate(contract.createdAt)}</p>
                                    </div>
                                </div>
                                {contract.status === "signed" && (
                                    <div className="flex gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{t("contracts.detail.contractSigned")}</p>
                                            <p className="text-gray-500 text-xs">
                                                {formatDate(contract.signedAt || new Date())}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">{t("contracts.detail.meta")}</h3>
                            <div className="space-y-2 text-sm">
                                <p>
                                    <span className="text-gray-500">{t("contracts.detail.idLabel")}</span> {contract.id}
                                </p>
                                <p>
                                    <span className="text-gray-500">{t("contracts.detail.createdLabel")}</span> {formatDate(contract.createdAt)}
                                </p>
                                <p>
                                    <span className="text-gray-500">{t("contracts.detail.typeLabel")}</span> {contract.contractType || t("contracts.detail.notAvailable")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
