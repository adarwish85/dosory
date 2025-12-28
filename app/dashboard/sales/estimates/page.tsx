"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEstimates } from "@/lib/hooks";
import type { EstimateStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<EstimateStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    viewed: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    accepted: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    declined: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    expired: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
};

const statusLabels: Record<EstimateStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
};

export default function SalesEstimatesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { estimates, loading, estimateStats, deleteEstimate } = useEstimates();

    const filteredEstimates = estimates.filter(est =>
        est.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        est.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const formatCurrency = (amount: number, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
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
            <div>
                <h2 className="text-xl font-bold text-gray-900">Estimates</h2>
                <button className="text-sm text-gray-500 hover:text-gray-900">View Financial Stats</button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(["draft", "sent", "accepted", "declined", "expired"] as EstimateStatus[]).map(status => {
                    const colors = statusColors[status];
                    const count = estimateStats[status] || 0;
                    const percent = estimateStats.total > 0 ? ((count / estimateStats.total) * 100).toFixed(1) : "0.0";
                    return (
                        <div key={status} className={`${colors.bg} ${colors.border} border rounded-md px-4 py-3`}>
                            <div className={`text-sm font-medium ${colors.text}`}>
                                {statusLabels[status]} ({percent}%)
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                                {count} / {estimateStats.total || 0}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/sales/estimates/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                            <Plus className="mr-2 h-4 w-4" /> Create New Estimate
                        </Button>
                    </Link>
                    <div className="flex items-center border rounded-md bg-white">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none border-r"><LayoutGrid className="h-4 w-4 text-gray-500" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none bg-gray-100"><List className="h-4 w-4 text-gray-900" /></Button>
                    </div>
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
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900">Estimate #</TableHead>
                                <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                                <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">Expiry Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEstimates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No estimates match your search." : "No estimates found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEstimates.map((est) => {
                                    const colors = statusColors[est.status];
                                    return (
                                        <TableRow key={est.id} className="group">
                                            <TableCell className="min-w-[150px] py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <Link href={`/dashboard/sales/estimates/${est.id}`} className="font-medium text-blue-600 hover:underline block truncate w-fit">
                                                        {est.number}
                                                    </Link>
                                                    <span className="text-xs text-gray-400">View Details</span>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4 -ml-0.5">
                                                        <Link href={`/dashboard/sales/estimates/${est.id}`} className="hover:text-blue-600 hover:underline px-0.5">View</Link>
                                                        <span className="text-gray-300">|</span>
                                                        <Link href={`/dashboard/sales/estimates/${est.id}/edit`} className="hover:text-blue-600 hover:underline px-0.5">Edit</Link>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={async (e) => { e.stopPropagation(); if (confirm("Delete this estimate?")) await deleteEstimate(est.id); }} className="hover:text-red-600 hover:underline px-0.5">Delete</button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{formatCurrency(est.total || 0, est.currency)}</TableCell>
                                            <TableCell className="text-gray-700">{est.customerName || "-"}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(est.date)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(est.expiryDate)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                                                    {statusLabels[est.status]}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
