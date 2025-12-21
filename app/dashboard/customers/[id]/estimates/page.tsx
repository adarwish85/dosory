"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useEstimates } from "@/lib/hooks/use-sales";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileDown, RefreshCw, Loader2 } from "lucide-react";
import { StatsGroup } from "@/components/dashboard/customers/stats-group";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function EstimatesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { estimates, loading: estimatesLoading, estimateStats } = useEstimates({ customerId: customerId || undefined });

    if (customerLoading || estimatesLoading) {
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
            draft: "bg-gray-50 text-gray-500 border-gray-100",
            sent: "bg-blue-50 text-blue-600 border-blue-100",
            expired: "bg-orange-50 text-orange-600 border-orange-100",
            declined: "bg-red-50 text-red-600 border-red-100",
            accepted: "bg-green-50 text-green-600 border-green-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Estimates</h2>

            <div className="flex gap-2">
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> Create New Estimate
                </Button>
                <Button variant="outline" className="text-gray-700">
                    <FileDown className="mr-2 h-4 w-4" /> Zip Estimates
                </Button>
            </div>

            <div className="flex justify-start">
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
                    { label: "Draft", amount: formatCurrency(estimateStats?.draft || 0), color: "default" },
                    { label: "Sent", amount: formatCurrency(estimateStats?.sent || 0), color: "blue" },
                    { label: "Expired", amount: formatCurrency(estimateStats?.expired || 0), color: "orange" },
                    { label: "Declined", amount: formatCurrency(estimateStats?.declined || 0), color: "red" },
                    { label: "Accepted", amount: formatCurrency(estimateStats?.accepted || 0), color: "green" },
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
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Estimate #</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Total Tax</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Expiry Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {estimates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No estimates found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                estimates.map((estimate) => (
                                    <TableRow key={estimate.id}>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            <Link href={`/dashboard/sales/estimates/${estimate.id}`}>
                                                EST-{String(estimate.number).padStart(6, "0")}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{formatCurrency(estimate.total)}</TableCell>
                                        <TableCell>{formatCurrency(estimate.taxTotal || 0)}</TableCell>
                                        <TableCell>{formatDate(estimate.date)}</TableCell>
                                        <TableCell>{formatDate(estimate.expiryDate)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusBadge(estimate.status)} font-normal`}>
                                                {formatStatus(estimate.status)}
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
