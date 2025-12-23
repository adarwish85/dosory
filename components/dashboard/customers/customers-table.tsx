"use client";

import { useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Loader2 } from "lucide-react";
import { useCustomers } from "@/lib/hooks";
import { CUSTOMER_GROUPS } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";

interface CustomersTableProps {
    customers: any[];
    loading: boolean;
}

export function CustomersTable({ customers, loading }: CustomersTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { updateCustomer } = useCustomers({ status: "all" });  // Keep hook for update capability only

    // PERFORMANCE: Use useMemo to prevent unnecessary recalculations
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer =>
            customer.company.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [customers, searchQuery]);

    const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
        await updateCustomer(id, {
            status: currentStatus === "active" ? "inactive" : "active"
        });
    }, [updateCustomer]);

    const formatDate = (timestamp: { toDate: () => Date } | null) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy h:mm a");
        } catch {
            return "-";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
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
                    <Button variant="outline" className="text-gray-600">Export</Button>
                    <Button variant="outline" className="text-gray-600">Bulk Actions</Button>
                    <Button variant="outline" size="icon" className="text-gray-600 w-9 px-0" aria-label="Refresh">
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-[40px]">
                                <Checkbox />
                            </TableHead>
                            <TableHead className="w-[60px]">#</TableHead>
                            <TableHead className="font-semibold text-gray-900">Company</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Groups</TableHead>
                            <TableHead>Date Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    {searchQuery ? "No customers match your search." : "No customers found. Create your first one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map((customer, index) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="min-w-[200px] py-3">
                                        <div className="flex flex-col group">
                                            <Link href={`/dashboard/customers/${customer.id}`} className="font-medium text-blue-600 hover:underline">
                                                {customer.company}
                                            </Link>
                                            <span className="text-gray-500 text-xs mt-0.5 group-hover:hidden">ID: {customer.id.substring(0, 8)}...</span>
                                            <div className="hidden group-hover:flex items-center gap-3 mt-0.5">
                                                <Link href={`/dashboard/customers/${customer.id}/settings`} className="text-xs font-medium text-gray-900 hover:underline">
                                                    Edit
                                                </Link>
                                                <span className="text-gray-300">|</span>
                                                <Link href={`/dashboard/customers/${customer.id}/settings`} className="text-xs font-medium text-red-600 hover:underline">
                                                    Delete
                                                </Link>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.phone || "-"}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={customer.status === "active"}
                                            onCheckedChange={() => handleStatusToggle(customer.id, customer.status)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {customer.groups?.map((groupValue: string) => {
                                                const groupLabel = CUSTOMER_GROUPS.find(g => g.value === groupValue)?.label || groupValue;
                                                return (
                                                    <Badge key={groupValue} variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
                                                        {groupLabel}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-xs">
                                        {formatDate(customer.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        Showing 1 to {filteredCustomers.length} of {filteredCustomers.length} entries
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" disabled>Previous</Button>
                        <Button variant="secondary" size="sm" className="h-8 w-8 p-0 bg-gray-200 text-gray-900">1</Button>
                        <Button variant="ghost" size="sm" disabled>Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
