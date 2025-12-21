"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileDown, RefreshCw, Loader2 } from "lucide-react";
import { StatsGroup } from "@/components/dashboard/customers/stats-group";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function InvoicesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { invoices, loading: invoicesLoading, invoiceStats } = useInvoices({ customerId: customerId || undefined });

    if (customerLoading || invoicesLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const formatCurrency = (amount: number = 0) => {
        return `$${amount.toFixed(2)}`;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            paid: "bg-green-50 text-green-600 border-green-100",
            unpaid: "bg-red-50 text-red-600 border-red-100",
            partially_paid: "bg-orange-50 text-orange-600 border-orange-100",
            overdue: "bg-red-50 text-red-700 border-red-200",
            cancelled: "bg-gray-50 text-gray-600 border-gray-100",
            draft: "bg-gray-50 text-gray-500 border-gray-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
            </div>

            <div className="flex gap-2">
                <Link href={`/dashboard/invoices/new?customerId=${customerId}`}>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" /> Create New Invoice
                    </Button>
                </Link>
                <Button variant="outline" className="text-gray-700">
                    <FileDown className="mr-2 h-4 w-4" /> Zip Invoices
                </Button>
            </div>

            <div className="flex justify-end">
                <Select defaultValue="2025">
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="2025" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <StatsGroup
                items={[
                    { label: "Outstanding Invoices", amount: formatCurrency(invoiceStats?.outstanding || 0), color: "orange" },
                    { label: "Past Due Invoices", amount: formatCurrency(invoiceStats?.overdue || 0), color: "default" },
                    { label: "Paid Invoices", amount: formatCurrency(invoiceStats?.paid || 0), color: "green" },
                ]}
            />

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Invoice #</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Total Tax</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Due Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No invoices found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            <Link href={`/dashboard/invoices/${invoice.id}`}>
                                                INV-{String(invoice.number).padStart(6, "0")}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{formatCurrency(invoice.total)}</TableCell>
                                        <TableCell>{formatCurrency(invoice.taxTotal || 0)}</TableCell>
                                        <TableCell>{formatDate(invoice.date)}</TableCell>
                                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusBadge(invoice.status)} font-normal`}>
                                                {formatStatus(invoice.status)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
