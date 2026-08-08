"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ChevronDown,
    FileText,
    Mail,
    Pencil,
    Printer,
    Download,
    ExternalLink,
    File,
    CreditCard,
    Copy,
    Send,
    Ban,
    Clock,
    Trash2,
    Plus,
    ArrowLeft,
    User,
    Eye,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useInvoice, useInvoices, useOrganizationSettings } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n";
import { InvoiceStatus, LineItem } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatDate = (date: any): string => {
    if (!date) return "-";
    try {
        if (date?.toDate) return format(date.toDate(), "dd/MM/yyyy");
        if (date instanceof Date) return format(date, "dd/MM/yyyy");
        if (typeof date === "string") return format(new Date(date), "dd/MM/yyyy");
        return "-";
    } catch {
        return "-";
    }
};

export default function InvoiceDetailsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { invoice, loading } = useInvoice(id);
    const { settings: orgSettings } = useOrganizationSettings();
    const { updateStatus, createInvoice, deleteInvoice } = useInvoices(); // Hooks for actions
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Action Handlers
    const handleUpdateStatus = async (newStatus: InvoiceStatus) => {
        if (!invoice) return;
        setActionLoading(newStatus);
        try {
            await updateStatus(id, newStatus);
            toast.success(t("invoices.detail.toast.statusUpdated", { status: newStatus }));
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error(t("invoices.detail.toast.statusFailed"));
        } finally {
            setActionLoading(null);
        }
    };

    const handleCopyInvoice = async () => {
        if (!invoice) return;
        setActionLoading("copy");
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _, ...invoiceData } = invoice;
            // Clean up data for new insertion if needed, dependent on createInvoice implementation
            // Here we assume createInvoice takes InvoiceFormData.
            // We might need to map fields if Invoice type differs slightly from FormData
            const newId = await createInvoice({
                ...invoiceData,
                items: invoice.items || [], // Ensure items
                date: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days default
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            toast.success(t("invoices.detail.toast.copied"));
            router.push(`/dashboard/invoices/${newId}`);
        } catch (error) {
            console.error("Error copying invoice:", error);
            toast.error(t("invoices.detail.toast.copyFailed"));
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!invoice || !confirm(t("invoices.detail.confirmDelete"))) return;
        setActionLoading("delete");
        try {
            await deleteInvoice(id);
            toast.success(t("invoices.detail.toast.deleted"));
            router.push("/dashboard/invoices");
        } catch (error) {
            console.error("Error deleting invoice:", error);
            toast.error(t("invoices.detail.toast.deleteFailed"));
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewAsCustomer = () => {
        window.open(`/pay/${id}`, "_blank");
    };

    const handleCreateCreditNote = () => {
        router.push(`/dashboard/sales/credit-notes/new?invoiceId=${id}`);
    };

    if (loading)
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    if (!invoice) return <div className="p-8 flex items-center justify-center">{t("invoices.detail.notFound")}</div>;

    // Sender / Bill-To / Ship-To.
    //
    // These six values used to fall back to HARDCODED literals — "WasilaDev", an address in
    // Nasr City, and "Egyptian German Industrial Corporation (EGIC)" — so every tenant whose
    // invoice did not carry its own snapshot rendered, and printed, another company's name and
    // postal address on its invoices. Now they fall back to THIS tenant's own organization
    // settings, and when a field is genuinely unset they render an honest placeholder rather
    // than someone else's data.
    const orgAddressLines = [
        orgSettings.address,
        [orgSettings.city, orgSettings.state].filter(Boolean).join(", "),
        [orgSettings.country, orgSettings.zipCode].filter(Boolean).join(" "),
    ]
        .map((l) => (l || "").trim())
        .filter(Boolean);

    const projectName = invoice.projectName || "";
    const senderName = invoice.senderName || orgSettings.companyName || t("invoices.detail.senderUnset");
    const senderAddress =
        invoice.senderAddress || (orgAddressLines.length > 0 ? orgAddressLines : [t("invoices.detail.addressUnset")]);
    const billToName = invoice.billToName || invoice.customerName || t("invoices.detail.customerUnset");
    const billToAddress = invoice.billToAddress || [t("invoices.detail.addressUnset")];
    const shipToAddress = invoice.shipToAddress || billToAddress;

    // Calculate totals if missing
    const subTotal =
        invoice.subtotal ||
        (invoice.items || []).reduce((acc: number, item: LineItem) => acc + item.quantity * item.rate, 0);
    const taxTotal = invoice.taxTotal || 0;
    const total = invoice.total || subTotal + taxTotal;

    // Assuming taxRate isn't directly on invoice object unless added
    const taxPercentage = subTotal > 0 ? (taxTotal / subTotal) * 100 : 0;

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "paid":
                return "bg-green-100 text-green-700 hover:bg-green-100/80";
            case "overdue":
                return "bg-red-100 text-red-700 hover:bg-red-100/80";
            case "draft":
                return "bg-gray-100 text-gray-700 hover:bg-gray-100/80";
            default:
                return "bg-red-50 text-red-600 hover:bg-red-50/80 border-red-100";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => router.push("/dashboard/invoices")}
                            className="gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" /> {t("invoices.detail.backToInvoices")}
                        </Button>
                        <Badge
                            variant="outline"
                            className={cn(
                                "px-3 py-1 text-sm font-medium border rounded pointer-events-none capitalize",
                                getStatusColor(invoice.status)
                            )}
                        >
                            {t(`invoices.status.${invoice.status}`)}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 bg-white"
                            title={t("invoices.detail.editInvoice")}
                        >
                            <Pencil
                                className="h-4 w-4 text-gray-600"
                                onClick={() => router.push(`/dashboard/invoices/${id}/edit`)}
                            />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 gap-1 bg-white px-3 text-gray-700">
                                    <FileText className="h-4 w-4" />
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" /> {t("invoices.detail.viewPdf")}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <ExternalLink className="mr-2 h-4 w-4" /> {t("invoices.detail.viewInNewTab")}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" /> {t("invoices.detail.download")}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Printer className="mr-2 h-4 w-4" /> {t("invoices.detail.print")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 bg-white"
                            title={t("invoices.detail.sendEmail")}
                        >
                            <Mail className="h-4 w-4 text-gray-600" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 gap-1 bg-white px-3 text-gray-700">
                                    {t("invoices.detail.more")}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuItem onClick={handleViewAsCustomer}>
                                    <User className="mr-2 h-4 w-4" /> {t("invoices.detail.viewAsCustomer")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleCreateCreditNote}>
                                    <CreditCard className="mr-2 h-4 w-4" /> {t("invoices.detail.createCreditNote")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info(t("invoices.detail.toast.attachFileSoon"))}>
                                    <File className="mr-2 h-4 w-4" /> {t("invoices.detail.attachFile")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleCopyInvoice} disabled={actionLoading === "copy"}>
                                    <Copy className="mr-2 h-4 w-4" />{" "}
                                    {actionLoading === "copy"
                                        ? t("invoices.detail.copying")
                                        : t("invoices.detail.copyInvoice")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleUpdateStatus("sent")}
                                    disabled={actionLoading === "sent"}
                                >
                                    <Send className="mr-2 h-4 w-4" /> {t("invoices.detail.markAsSent")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleUpdateStatus("cancelled")}
                                    disabled={actionLoading === "cancelled"}
                                >
                                    <Ban className="mr-2 h-4 w-4" /> {t("invoices.detail.markAsCancelled")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => toast.info(t("invoices.detail.toast.reminderPauseSoon"))}
                                >
                                    <Clock className="mr-2 h-4 w-4" /> {t("invoices.detail.pauseOverdueReminders")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={actionLoading === "delete"}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />{" "}
                                    {actionLoading === "delete" ? t("invoices.detail.deleting") : t("common.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button className="h-9 bg-green-500 hover:bg-green-600 text-white gap-2">
                            <Plus className="h-4 w-4" /> {t("invoices.detail.payment")}
                        </Button>
                    </div>
                </div>

                {/* Main Paper Invoice Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 min-h-[800px] text-gray-900">
                    {/* Project Relation Banner */}
                    <div className="mb-10 text-gray-700">
                        {t("invoices.detail.relatedToProject")}{" "}
                        <Link href="#" className="text-blue-600 hover:underline font-medium">
                            {projectName}
                        </Link>
                    </div>

                    {/* Header Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Left: Invoice # and Sender */}
                        <div>
                            <h1 className="text-2xl font-bold text-blue-600 mb-6">{invoice.number}</h1>

                            <div className="space-y-1 text-sm text-gray-800">
                                <p className="font-bold">{senderName}</p>
                                {senderAddress.map((line: string, i: number) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                        </div>

                        {/* Right: Bill To & Ship To */}
                        <div className="text-right space-y-8">
                            {/* Bill To */}
                            <div>
                                <p className="text-sm font-bold text-gray-900 mb-1">{t("invoices.detail.billTo")}</p>
                                <p className="text-blue-600 font-medium mb-1">{billToName}</p>
                                <div className="text-sm text-gray-500 space-y-0.5">
                                    {billToAddress.map((line: string, i: number) => (
                                        <p key={i}>{line}</p>
                                    ))}
                                </div>
                            </div>

                            {/* Ship To */}
                            <div>
                                <p className="text-sm font-bold text-gray-900 mb-1">{t("invoices.detail.shipTo")}</p>
                                <div className="text-sm text-gray-500 space-y-0.5">
                                    {shipToAddress.map((line: string, i: number) => (
                                        <p key={i}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dates & Reference Grid */}
                    <div className="flex justify-end mb-12">
                        <div className="text-right space-y-1 text-sm">
                            <div className="flex justify-end gap-2">
                                <span className="font-semibold text-gray-900">{t("invoices.detail.invoiceDate")}</span>
                                <span className="text-gray-700">{formatDate(invoice.date)}</span>
                            </div>
                            <div className="flex justify-end gap-2">
                                <span className="font-semibold text-gray-900">{t("invoices.detail.dueDate")}</span>
                                <span className="text-gray-700">{formatDate(invoice.dueDate)}</span>
                            </div>
                            <div className="flex justify-end gap-2">
                                <span className="font-semibold text-gray-900">{t("invoices.detail.project")}</span>
                                <span className="text-gray-700">{projectName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-8">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50 border-y border-gray-100">
                                    <TableHead className="w-[50px] font-bold text-gray-900">#</TableHead>
                                    <TableHead className="font-bold text-gray-900">
                                        {t("invoices.detail.colItem")}
                                    </TableHead>
                                    <TableHead className="text-right font-bold text-gray-900 w-[80px]">
                                        {t("invoices.detail.colQty")}
                                    </TableHead>
                                    <TableHead className="text-right font-bold text-gray-900 w-[120px]">
                                        {t("invoices.detail.colRate")}
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-gray-900 w-[100px]">
                                        {t("invoices.detail.colTax")}
                                    </TableHead>
                                    <TableHead className="text-right font-bold text-gray-900 w-[120px]">
                                        {t("invoices.detail.colAmount")}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.items &&
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    invoice.items.map((item: any, index: number) => (
                                        <TableRow key={item.id || index} className="border-b border-gray-50">
                                            <TableCell className="text-gray-500 align-top py-4">{index + 1}</TableCell>
                                            <TableCell className="align-top py-4">
                                                <p className="font-medium text-gray-800">{item.description}</p>
                                                {item.longDescription && (
                                                    <p className="text-sm text-gray-500 mt-1">{item.longDescription}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-700 align-top py-4">
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-700 align-top py-4">
                                                {item.rate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-center text-gray-500 text-sm align-top py-4">
                                                <div>{t("invoices.detail.vat")}</div>
                                                <div>{taxPercentage.toFixed(2)}%</div>
                                            </TableCell>
                                            <TableCell className="text-right text-gray-700 align-top py-4">
                                                {(item.quantity * item.rate).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer / Totals */}
                    <div className="flex justify-end pt-4 mb-20">
                        <div className="w-72 space-y-3">
                            <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                <span className="font-medium text-gray-700">{t("invoices.detail.subTotal")}</span>
                                <span className="text-gray-600">
                                    EGP{subTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                <span className="font-medium text-gray-700">
                                    {t("invoices.detail.vatPercent", { percent: taxPercentage.toFixed(2) })}
                                </span>
                                <span className="text-gray-600">
                                    EGP{taxTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                <span className="font-medium text-gray-700">{t("invoices.detail.total")}</span>
                                <span className="text-gray-600">
                                    EGP{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between text-base py-2 font-bold">
                                <span className="text-red-500">{t("invoices.detail.amountDue")}</span>
                                <span className="text-red-500">
                                    EGP{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 border-t pt-8">
                        <div className="text-sm">
                            <span className="font-bold text-gray-900 block mb-2">{t("invoices.detail.note")}</span>
                            <p className="text-gray-500">{t("invoices.detail.thankYou", { sender: senderName })}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
