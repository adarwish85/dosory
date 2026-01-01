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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: <Receipt className="h-3 w-3" /> },
    sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: <Send className="h-3 w-3" /> },
    viewed: { label: "Viewed", color: "bg-purple-100 text-purple-700", icon: <Eye className="h-3 w-3" /> },
    partial: { label: "Partial", color: "bg-amber-100 text-amber-700", icon: <CreditCard className="h-3 w-3" /> },
    paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
    cancelled: { label: "Cancelled", color: "bg-gray-200 text-gray-500", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function ProjectSalesPage() {
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
            result = result.filter(inv =>
                inv.number?.toLowerCase().includes(q) ||
                inv.customerName?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") {
            result = result.filter(inv => inv.status === statusFilter);
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
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
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
                            Total Invoiced
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{formatCurrency(totals.totalInvoiced)}</div>
                        <p className="text-xs text-blue-600 mt-1">{invoices.length} invoices</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Total Paid
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.totalPaid)}</div>
                        <p className="text-xs text-green-600 mt-1">{Number(invoiceStats.paid) || 0} paid invoices</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Outstanding
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">{formatCurrency(totals.totalDue)}</div>
                        <p className="text-xs text-amber-600 mt-1">{(Number(invoiceStats.sent) || 0) + (Number(invoiceStats.overdue) || 0)} pending</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Collection Rate
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
                    <span className="font-bold">{invoices.length}</span> All
                </button>
                {(["draft", "sent", "partial", "paid", "overdue"] as InvoiceStatus[]).map(status => {
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
                            <span className="font-bold">{count}</span> {config.label}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search invoices..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href={`/dashboard/invoices/new?projectId=${projectId}&projectName=${encodeURIComponent(project?.name || "")}&customerId=${project?.customerId || ""}`}>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" /> New Invoice
                    </Button>
                </Link>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                    <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">No invoices found</p>
                                    <p className="text-sm mt-1">
                                        {searchQuery ? "Try a different search term" : "Create an invoice to track project revenue"}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map(invoice => {
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
                                        <TableCell className={cn(
                                            "text-gray-500",
                                            invoice.status === "overdue" && "text-red-600 font-medium"
                                        )}>
                                            {invoice.dueDate ? format(invoice.dueDate.toDate(), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(invoice.total)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">
                                            {formatCurrency(invoice.amountPaid)}
                                        </TableCell>
                                        <TableCell className={cn(
                                            "text-right",
                                            invoice.amountDue > 0 ? "text-amber-600 font-medium" : "text-gray-400"
                                        )}>
                                            {formatCurrency(invoice.amountDue)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("flex items-center gap-1 w-fit", config.color)}>
                                                {config.icon} {config.label}
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
                                                            <Eye className="mr-2 h-4 w-4" /> View
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {invoice.status === "draft" && (
                                                        <DropdownMenuItem onClick={() => updateStatus(invoice.id, "sent")}>
                                                            <Send className="mr-2 h-4 w-4" /> Mark as Sent
                                                        </DropdownMenuItem>
                                                    )}
                                                    {invoice.amountDue > 0 && invoice.status !== "paid" && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard/invoices/${invoice.id}/payment`}>
                                                                <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => {
                                                            if (confirm("Delete this invoice?")) {
                                                                deleteInvoice(invoice.id);
                                                                toast.success("Invoice deleted");
                                                            }
                                                        }}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" /> Delete
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
