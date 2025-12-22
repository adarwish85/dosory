"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, LayoutGrid, List, FileText, ArrowLeftRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { StatsGroup } from "@/components/dashboard/customers/stats-group";
import { useInvoices } from "@/lib/hooks/use-invoices";

export default function SalesInvoicesPage() {
    const { invoices, loading, invoiceStats, deleteInvoice } = useInvoices();

    // Helper: Calculate counts for grouped statuses
    const getCount = (status: string) => (invoiceStats?.[status] as number) || 0;

    // Unpaid typically includes: sent, viewed
    // We treat "Unpaid" widget as strict "Sent + Viewed + Unpaid" (if unpaid exists as explicit status)
    const unpaidCount = getCount('sent') + getCount('viewed') + getCount('unpaid');
    const unpaidTotal = (invoices.length || 1);
    const unpaidPerc = (unpaidCount / unpaidTotal) * 100;

    const paidCount = getCount('paid');
    const paidPerc = (paidCount / unpaidTotal) * 100;

    const partialCount = getCount('partial');
    const partialPerc = (partialCount / unpaidTotal) * 100;

    const overdueCount = getCount('overdue');
    const overduePerc = (overdueCount / unpaidTotal) * 100;

    const draftCount = getCount('draft');
    const draftPerc = (draftCount / unpaidTotal) * 100;

    // Financial calculations
    const amounts = invoiceStats?.amountsByStatus || {};
    const outstandingAmount = (amounts.sent || 0) + (amounts.viewed || 0) + (amounts.partial || 0) + (amounts.overdue || 0) + (amounts.unpaid || 0);
    const pastDueAmount = amounts.overdue || 0;
    const paidAmount = amounts.paid || 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return new Intl.DateTimeFormat('en-GB').format(date);
        } catch {
            return "-";
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
                        <a href="#" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            Recurring Invoices →
                        </a>
                    </div>
                    {/* Currency selectors removed for brevity/dynamic data focus, assuming defaults or handled elsewhere */}
                </div>

                {/* Summary Badges */}
                <div className="flex justify-end gap-2 text-sm font-medium">
                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded border border-green-100">
                        Paid Invoices <span className="font-bold ml-1">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="bg-red-50 text-red-700 px-3 py-1 rounded border border-red-100">
                        Past Due Invoices <span className="font-bold ml-1">{formatCurrency(pastDueAmount)}</span>
                    </div>
                    <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded border border-orange-100">
                        Outstanding Invoices <span className="font-bold ml-1">{formatCurrency(outstandingAmount)}</span>
                    </div>
                </div>

                {/* Stats Cards */}
                <StatsGroup
                    items={[
                        { label: `Unpaid (${unpaidPerc.toFixed(2)}%)`, amount: `${unpaidCount} / ${invoices.length}`, color: "red" },
                        { label: `Paid (${paidPerc.toFixed(2)}%)`, amount: `${paidCount} / ${invoices.length}`, color: "green" },
                        { label: `Partially Paid (${partialPerc.toFixed(2)}%)`, amount: `${partialCount} / ${invoices.length}`, color: "orange" },
                        { label: `Overdue (${overduePerc.toFixed(2)}%)`, amount: `${overdueCount} / ${invoices.length}`, color: "orange" },
                        { label: `Draft (${draftPerc.toFixed(2)}%)`, amount: `${draftCount} / ${invoices.length}`, color: "default" },
                    ]}
                />
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <a href="/dashboard/invoices/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                            <Plus className="mr-2 h-4 w-4" /> Create New Invoice
                        </Button>
                    </a>
                    <Button
                        variant="destructive"
                        onClick={async () => {
                            if (window.confirm("Are you sure you want to DELETE ALL 19 invoices? This cannot be undone.")) {
                                try {
                                    await Promise.all(invoices.map(inv => deleteInvoice(inv.id)));
                                    toast.success("All invoices deleted");
                                } catch (error) {
                                    console.error(error);
                                    toast.error("Failed to delete all invoices");
                                }
                            }
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete All (Debug)
                    </Button>
                </div>
                {/* Filters omitted for brevity */}
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white overflow-hidden flex flex-col">
                <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Invoice #</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Total Tax</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Customer</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Due Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((row) => (
                                    <TableRow key={row.id} className="h-16 group">
                                        <TableCell className="min-w-[150px] py-3">
                                            <div className="flex flex-col group">
                                                <span className="text-gray-900 hover:text-blue-600 cursor-pointer text-base font-semibold">
                                                    {row.number || "INV-???"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-900">{formatCurrency(row.total || 0)}</TableCell>
                                        <TableCell className="text-gray-900">{formatCurrency(row.taxTotal || 0)}</TableCell>
                                        <TableCell className="text-gray-500">{formatDate(row.date)}</TableCell>
                                        <TableCell className="text-gray-900 hover:text-blue-600 cursor-pointer">{row.customerName || "Unknown Customer"}</TableCell>
                                        <TableCell className="text-gray-900">{formatDate(row.dueDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-normal capitalize ${row.status === 'paid' ? 'text-green-600 border-green-200 bg-green-50' :
                                                row.status === 'overdue' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                                                    'text-gray-600 border-gray-200 bg-gray-50'
                                                }`}>
                                                {row.status || "draft"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <a href={`/dashboard/invoices/${row.id}`} className="text-xs font-medium text-gray-900 hover:underline">View</a>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="text-sm text-gray-500 mt-4">
                Showing all {invoices.length} invoices found in database
            </div>
        </div>
    );
}
