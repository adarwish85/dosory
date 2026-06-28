"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useProject } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
    Receipt,
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash,
    Send,
    Eye,
    DollarSign,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    CreditCard,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

const statusConfig: Record<InvoiceStatus, { labelKey: string; color: string; icon: React.ReactNode }> = {
    draft: { labelKey: "projects.sales.status.draft", color: "bg-gray-100 text-gray-700", icon: <Receipt className="h-3 w-3" /> },
    sent: { labelKey: "projects.sales.status.sent", color: "bg-blue-100 text-blue-700", icon: <Send className="h-3 w-3" /> },
    viewed: { labelKey: "projects.sales.status.viewed", color: "bg-purple-100 text-purple-700", icon: <Eye className="h-3 w-3" /> },
    partial: { labelKey: "projects.sales.status.partial", color: "bg-amber-100 text-amber-700", icon: <CreditCard className="h-3 w-3" /> },
    paid: { labelKey: "projects.sales.status.paid", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    overdue: { labelKey: "projects.sales.status.overdue", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
    cancelled: { labelKey: "projects.sales.status.cancelled", color: "bg-gray-200 text-gray-500", icon: <AlertCircle className="h-3 w-3" /> },
    void: { labelKey: "projects.sales.status.void", color: "bg-slate-100 text-slate-700", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function ProjectSalesPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { project, loading: projectLoading } = useProject(projectId);
    const { invoices, loading, invoiceStats, updateStatus, deleteInvoice } = useInvoices({ projectId });

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

    // Filter invoices
    const filteredInvoices = useMemo(() => {
        let result = invoices;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (inv) => inv.number?.toLowerCase().includes(q) || inv.customerName?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") {
            result = result.filter((inv) => inv.status === statusFilter);
        }
        return result;
    }, [invoices, searchQuery, statusFilter]);

    // Calculate totals
    const totals = useMemo(() => {
        const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
        const totalDue = invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
        const paidPercent = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
        return { totalInvoiced, totalPaid, totalDue, paidPercent };
    }, [invoices]);

    if (loading || projectLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-[400px] rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            {t("projects.sales.totalInvoiced")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{formatCurrency(totals.totalInvoiced)}</div>
                        <p className="text-xs text-blue-600 mt-1">{t("projects.sales.invoicesCount", { count: invoices.length })}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t("projects.sales.totalPaid")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.totalPaid)}</div>
                        <p className="text-xs text-green-600 mt-1">{t("projects.sales.paidInvoicesCount", { count: Number(invoiceStats.paid) || 0 })}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t("projects.sales.outstanding")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">{formatCurrency(totals.totalDue)}</div>
                        <p className="text-xs text-amber-600 mt-1">
                            {t("projects.sales.pendingCount", { count: (Number(invoiceStats.sent) || 0) + (Number(invoiceStats.overdue) || 0) })}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            {t("projects.sales.collectionRate")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">{totals.paidPercent}%</div>
                        <Progress value={totals.paidPercent} className="h-1.5 mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                        "border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors",
                        statusFilter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <span className="font-bold">{invoices.length}</span> {t("projects.sales.filterAll")}
                </button>
                {(["draft", "sent", "partial", "paid", "overdue"] as InvoiceStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const count = Number(invoiceStats[status]) || 0;
                    const isActive = statusFilter === status;
                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(isActive ? "all" : status)}
                            className={cn(
                                "border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors",
                                isActive ? config.color : "bg-white text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            {config.icon}
                            <span className="font-bold">{count}</span> {t(config.labelKey)}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder={t("projects.sales.searchPlaceholder")}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link
                    href={`/dashboard/invoices/new?projectId=${projectId}&projectName=${encodeURIComponent(project?.name || "")}&customerId=${project?.customerId || ""}`}
                >
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" /> {t("projects.sales.new")}
                    </Button>
                </Link>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">{t("projects.sales.invoiceNumber")}</TableHead>
                            <TableHead>{t("projects.sales.customer")}</TableHead>
                            <TableHead>{t("common.date")}</TableHead>
                            <TableHead>{t("projects.sales.dueDate")}</TableHead>
                            <TableHead className="text-right">{t("projects.sales.total")}</TableHead>
                            <TableHead className="text-right">{t("projects.sales.paid")}</TableHead>
                            <TableHead className="text-right">{t("projects.sales.due")}</TableHead>
                            <TableHead>{t("common.status")}</TableHead>
                            <TableHead className="w-20 text-center">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                    <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">{t("projects.sales.emptyTitle")}</p>
                                    <p className="text-sm mt-1">
                                        {searchQuery
                                            ? t("projects.sales.emptySearch")
                                            : t("projects.sales.emptyHint")}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice: Invoice) => {
                                const config = statusConfig[invoice.status];
                                return (
                                    <TableRow key={invoice.id} className="group hover:bg-gray-50">
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/dashboard/invoices/${invoice.id}`}
                                                className="hover:text-blue-600 hover:underline"
                                            >
                                                {invoice.numberFormatted || invoice.number}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{invoice.customerName || "-"}</TableCell>
                                        <TableCell className="text-gray-500">
                                            {invoice.date ? format(invoice.date.toDate(), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-gray-500",
                                                invoice.status === "overdue" && "text-red-600 font-medium"
                                            )}
                                        >
                                            {invoice.dueDate ? format(invoice.dueDate.toDate(), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(invoice.total)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">
                                            {formatCurrency(invoice.amountPaid)}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-right",
                                                invoice.amountDue > 0 ? "text-amber-600 font-medium" : "text-gray-400"
                                            )}
                                        >
                                            {formatCurrency(invoice.amountDue)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("flex items-center gap-1 w-fit", config.color)}>
                                                {config.icon} {t(config.labelKey)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/invoices/${invoice.id}`}>
                                                            <Eye className="mr-2 h-4 w-4" /> {t("common.view")}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                                                            <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {invoice.status === "draft" && (
                                                        <DropdownMenuItem
                                                            onClick={() => updateStatus(invoice.id, "sent")}
                                                        >
                                                            <Send className="mr-2 h-4 w-4" /> {t("projects.sales.markAsSent")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {invoice.amountDue > 0 && invoice.status !== "paid" && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard/invoices/${invoice.id}/payment`}>
                                                                <CreditCard className="mr-2 h-4 w-4" /> {t("projects.sales.recordPayment")}
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => {
                                                            if (confirm(t("projects.sales.deleteConfirm"))) {
                                                                deleteInvoice(invoice.id);
                                                                toast.success(t("projects.sales.deletedToast"));
                                                            }
                                                        }}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" /> {t("common.delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
