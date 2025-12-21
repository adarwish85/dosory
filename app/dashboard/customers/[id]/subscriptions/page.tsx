"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useSubscriptions } from "@/lib/hooks/use-expenses";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function SubscriptionsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { subscriptions, loading: subscriptionsLoading } = useSubscriptions({ customerId: customerId || undefined });

    if (customerLoading || subscriptionsLoading) {
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
            active: "bg-green-50 text-green-600 border-green-100",
            future: "bg-blue-50 text-blue-600 border-blue-100",
            not_subscribed: "bg-gray-50 text-gray-500 border-gray-100",
            cancelled: "bg-red-50 text-red-600 border-red-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Subscriptions</h2>

            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" /> New Subscription
            </Button>

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
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Name</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Description</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Next Invoice</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No subscriptions found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subscriptions.map((subscription) => (
                                    <TableRow key={subscription.id}>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            <Link href={`/dashboard/subscriptions/${subscription.id}`}>
                                                {subscription.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-gray-600 max-w-xs truncate">{subscription.description || "-"}</TableCell>
                                        <TableCell>{formatCurrency(subscription.amount)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusBadge(subscription.status)} font-normal`}>
                                                {formatStatus(subscription.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(subscription.nextBillingDate)}</TableCell>
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
