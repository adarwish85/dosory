"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscriptions } from "@/lib/hooks";
import type { SubscriptionStatus } from "@/lib/types";
import { format } from "date-fns";

const statusColors: Record<SubscriptionStatus, { bg: string; text: string }> = {
    active: { bg: "bg-green-100", text: "text-green-600" },
    past_due: { bg: "bg-orange-100", text: "text-orange-600" },
    cancelled: { bg: "bg-gray-100", text: "text-gray-600" },
    paused: { bg: "bg-yellow-100", text: "text-yellow-600" },
    future: { bg: "bg-blue-100", text: "text-blue-600" },
};

const statusLabels: Record<SubscriptionStatus, string> = {
    active: "Active",
    past_due: "Past Due",
    cancelled: "Cancelled",
    paused: "Paused",
    future: "Future",
};

export default function SubscriptionsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { subscriptions, loading, subscriptionStats } = useSubscriptions();

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
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
                <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
                <Button
                    className="bg-gray-900 text-white hover:bg-gray-800 rounded-md"
                    onClick={() => window.location.href = '/dashboard/subscriptions/plans'}
                >
                    <Plus className="mr-2 h-4 w-4" /> New Subscription
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="bg-white rounded-md border p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Subscriptions Summary</h3>
                <div className="flex flex-wrap items-center gap-8 text-sm">
                    {(["active", "future", "past_due", "paused", "cancelled"] as SubscriptionStatus[]).map(status => {
                        const colors = statusColors[status];
                        const count = subscriptionStats[status] || 0;
                        return (
                            <div key={status} className="flex items-center gap-2">
                                <span className="text-xl font-bold text-gray-900">{count}</span>
                                <span className={`${colors.text} font-medium`}>{statusLabels[status]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-md p-4">
                <div className="flex justify-between items-center gap-4 mb-4">
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

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-10 font-semibold text-gray-900">#</TableHead>
                            <TableHead className="font-semibold text-gray-900">Subscription Name</TableHead>
                            <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                            <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                            <TableHead className="font-semibold text-gray-900">Status</TableHead>
                            <TableHead className="font-semibold text-gray-900">Next Billing</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubscriptions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    {searchQuery ? "No subscriptions match your search." : "No subscriptions found. Create your first one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubscriptions.map((sub, index) => {
                                const colors = statusColors[sub.status];
                                return (
                                    <TableRow key={sub.id}>
                                        <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            {sub.name}
                                        </TableCell>
                                        <TableCell className="text-gray-700">{sub.customerName}</TableCell>
                                        <TableCell className="font-medium">{formatCurrency(sub.amount, sub.currency)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${colors.bg} ${colors.text} border-0`}>
                                                {statusLabels[sub.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{formatDate(sub.nextBillingDate)}</TableCell>
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
