"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProposals } from "@/lib/hooks";
import type { ProposalStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<ProposalStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    open: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    revised: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
    declined: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    accepted: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

const statusLabels: Record<ProposalStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    open: "Open",
    revised: "Revised",
    declined: "Declined",
    accepted: "Accepted",
};

export default function ProposalsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { proposals, loading, proposalStats } = useProposals();

    const filteredProposals = proposals.filter(prop =>
        prop.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.subject?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Proposals</h2>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/sales/proposals/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                            <Plus className="mr-2 h-4 w-4" /> New Proposal
                        </Button>
                    </Link>
                    <div className="flex items-center border rounded-md bg-white">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none border-r"><LayoutGrid className="h-4 w-4 text-gray-500" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none bg-gray-100"><List className="h-4 w-4 text-gray-900" /></Button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2">
                {(["draft", "sent", "open", "accepted", "declined"] as ProposalStatus[]).map(status => {
                    const count = proposalStats[status] || 0;
                    const colors = statusColors[status];
                    return (
                        <div key={status} className={`${colors.bg} ${colors.border} border rounded-full px-3 py-1 text-sm`}>
                            <span className="font-bold text-gray-900">{count}</span>{" "}
                            <span className={colors.text}>{statusLabels[status]}</span>
                        </div>
                    );
                })}
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
                                <TableHead className="font-semibold text-gray-900">Proposal #</TableHead>
                                <TableHead className="font-semibold text-gray-900">Subject</TableHead>
                                <TableHead className="font-semibold text-gray-900">Total</TableHead>
                                <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">Open Till</TableHead>
                                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No proposals match your search." : "No proposals found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((prop) => {
                                    const colors = statusColors[prop.status];
                                    return (
                                        <TableRow key={prop.id} className="group">
                                            <TableCell className="font-medium">
                                                <Link href={`/dashboard/sales/proposals/${prop.id}`} className="text-blue-600 hover:underline">
                                                    {prop.number}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900">{prop.subject}</TableCell>
                                            <TableCell className="text-gray-900">{formatCurrency(prop.total || 0, prop.currency)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(prop.date)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(prop.openTill)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                                                    {statusLabels[prop.status]}
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
