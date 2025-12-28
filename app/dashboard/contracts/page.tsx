"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContracts, useSettings } from "@/lib/hooks";
import type { ContractStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<ContractStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    signed: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    expired: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    trash: { bg: "bg-gray-50", text: "text-gray-400", border: "border-gray-200" },
};

const statusLabels: Record<ContractStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    signed: "Signed",
    expired: "Expired",
    trash: "Trash",
};

export default function ContractsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { contracts, loading, contractStats } = useContracts();
    const { settings } = useSettings();
    const orgCurrency = settings.currency || "USD";

    const filteredContracts = contracts.filter(contract =>
        contract.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const formatCurrency = (amount: number | undefined, currency = "USD") => {
        if (!amount) return "-";
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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Contracts</h2>
                <Link href="/dashboard/contracts/new">
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                        <Plus className="mr-2 h-4 w-4" /> New Contract
                    </Button>
                </Link>
            </div>

            {/* Stats Pills */}
            <div className="flex flex-wrap gap-2">
                {(["draft", "sent", "signed", "expired"] as ContractStatus[]).map(status => {
                    const colors = statusColors[status];
                    const count = contractStats[status] || 0;
                    return (
                        <div key={status} className={`${colors.bg} ${colors.border} border rounded-full px-3 py-1 text-sm`}>
                            <span className="font-bold text-gray-900">{count}</span>{" "}
                            <span className={colors.text}>{statusLabels[status]}</span>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
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
                                <TableHead className="w-10 font-semibold text-gray-900">#</TableHead>
                                <TableHead className="font-semibold text-gray-900">Subject</TableHead>
                                <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                                <TableHead className="font-semibold text-gray-900">Value</TableHead>
                                <TableHead className="font-semibold text-gray-900">Start Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">End Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredContracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No contracts match your search." : "No contracts found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContracts.map((contract, index) => {
                                    const colors = statusColors[contract.status];
                                    return (
                                        <TableRow key={contract.id} className="group">
                                            <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="min-w-[200px] py-3">
                                                <div className="flex flex-col group">
                                                    <Link href={`/dashboard/contracts/${contract.id}`} className="font-medium text-blue-600 hover:underline">
                                                        {contract.subject}
                                                    </Link>
                                                    <span className="text-gray-500 text-xs mt-0.5 group-hover:hidden">ID: {contract.id.substring(0, 8)}...</span>
                                                    <div className="hidden group-hover:flex items-center gap-3 mt-0.5">
                                                        <Link href={`/dashboard/contracts/${contract.id}/edit`} className="text-xs font-medium text-gray-900 hover:underline">
                                                            Edit
                                                        </Link>
                                                        <span className="text-gray-300">|</span>
                                                        <Link href={`/dashboard/contracts/${contract.id}/delete`} className="text-xs font-medium text-red-600 hover:underline">
                                                            Delete
                                                        </Link>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-700">{contract.customerName}</TableCell>
                                            <TableCell className="font-medium">{formatCurrency(contract.contractValue, orgCurrency)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(contract.startDate)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(contract.endDate)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                                                    {statusLabels[contract.status]}
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
