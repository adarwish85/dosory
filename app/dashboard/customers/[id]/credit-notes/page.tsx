"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useCreditNotes } from "@/lib/hooks/use-customer-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

export default function CreditNotesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { creditNotes, loading: creditNotesLoading } = useCreditNotes({ customerId: customerId || undefined });

    if (customerLoading || creditNotesLoading) {
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
            open: "bg-blue-50 text-blue-600 border-blue-100",
            closed: "bg-green-50 text-green-600 border-green-100",
            void: "bg-gray-50 text-gray-500 border-gray-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    // Calculate totals
    const openTotal = creditNotes.filter(cn => cn.status === "open").reduce((sum, cn) => sum + cn.amount, 0);
    const closedTotal = creditNotes.filter(cn => cn.status === "closed").reduce((sum, cn) => sum + cn.amount, 0);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Credit Notes</h2>

            <Link href={`/dashboard/sales/credit-notes/new?customerId=${customerId}`}>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> Create Credit Note
                </Button>
            </Link>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border p-4">
                    <div className="text-sm text-gray-500">Open Credits</div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(openTotal)}</div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                    <div className="text-sm text-gray-500">Applied Credits</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(closedTotal)}</div>
                </div>
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
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Credit Note #</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {creditNotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        No credit notes found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                creditNotes.map((creditNote) => (
                                    <TableRow key={creditNote.id}>
                                        <TableCell className="font-medium text-blue-600">
                                            CN-{creditNote.number}
                                        </TableCell>
                                        <TableCell>{formatCurrency(creditNote.amount)}</TableCell>
                                        <TableCell>{formatDate(creditNote.date)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusBadge(creditNote.status)} font-normal`}>
                                                {formatStatus(creditNote.status)}
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
