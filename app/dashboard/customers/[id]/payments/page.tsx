"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { usePayments } from "@/lib/hooks/use-customer-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function PaymentsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { payments, loading: paymentsLoading } = usePayments({ customerId: customerId || undefined });

    if (customerLoading || paymentsLoading) {
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

    // Calculate total payments
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Payments</h2>

            <div className="flex gap-2">
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> Record Payment
                </Button>
            </div>

            <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-500">Total Payments Received</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPayments)}</div>
            </div>

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
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Invoice</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Payment Mode</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Transaction ID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No payments found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{formatDate(payment.date)}</TableCell>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            {payment.invoiceNumber ? (
                                                <Link href={`/dashboard/invoices/${payment.invoiceId}`}>
                                                    {payment.invoiceNumber}
                                                </Link>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-green-600 font-medium">{formatCurrency(payment.amount)}</TableCell>
                                        <TableCell>{payment.paymentMode}</TableCell>
                                        <TableCell className="text-gray-500">{payment.transactionId || "-"}</TableCell>
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
