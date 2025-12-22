"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { useInvoices } from "@/lib/hooks";
import type { InvoiceStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { InvoiceHeader } from "@/components/dashboard/invoices/invoice-header";
import { InvoiceStats } from "@/components/dashboard/invoices/invoice-stats";
import { InvoiceActions } from "@/components/dashboard/invoices/invoice-actions";

const statusColors: Record<InvoiceStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    viewed: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    partial: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
    paid: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    overdue: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    cancelled: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

const statusLabels: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
};

export default function InvoicesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
    const { invoices, loading, deleteInvoice } = useInvoices({ status: statusFilter });

    const filteredInvoices = invoices.filter(invoice =>
        invoice.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* New Design Components */}
            <InvoiceHeader invoices={invoices} />
            <InvoiceStats
                invoices={invoices}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />
            <InvoiceActions
                showDebug={false}
                onDeleteAll={async () => {
                    if (window.confirm(`Are you sure you want to DELETE ALL ${invoices.length} invoices? This cannot be undone.`)) {
                        try {
                            await Promise.all(invoices.map(inv => deleteInvoice(inv.id)));
                            // Toast or alert handled by caller or component? 
                            // Since toast isn't imported here, let's rely on useInvoices or add toast here.
                            // Better: Import toast.
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }}
            />

            {/* Table */}
            <div className="border rounded-md bg-white shadow-sm">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                    {/* Temporarily keeping table controls here or moving to InvoiceActions? 
                         The design shows "Filters" in actions, but search is usually close to table.
                         Let's keep search here to be functional, but maybe hidden/styled if needed.
                         The design has "Filters" button on top right.
                         I'll add the search bar here as a functional fallback until refined.
                     */}
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px] h-9 bg-white">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search invoices..."
                            className="pl-9 h-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">Invoice #</TableHead>
                            <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                            <TableHead className="font-semibold text-gray-900">Date</TableHead>
                            <TableHead className="font-semibold text-gray-900">Due Date</TableHead>
                            <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                            <TableHead className="font-semibold text-gray-900">Status</TableHead>
                            <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    {searchQuery ? "No invoices match your search." : "No invoices found. Create your first one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => {
                                const colors = statusColors[invoice.status];
                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:underline">
                                                {invoice.number}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-gray-700">{invoice.customerName || "-"}</TableCell>
                                        <TableCell className="text-gray-500">{formatDate(invoice.date)}</TableCell>
                                        <TableCell className="text-gray-500">{formatDate(invoice.dueDate)}</TableCell>
                                        <TableCell className="font-medium text-gray-900">{formatCurrency(invoice.total || 0)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${colors.bg} ${colors.text} ${colors.border} border shadow-none font-medium`}>
                                                {statusLabels[invoice.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/invoices/${invoice.id}`}>
                                                <Button variant="ghost" size="sm">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
