"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Upload, FileText, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useExpenses, useSettings } from "@/lib/hooks";
import { format } from "date-fns";
import Link from "next/link";

export default function ExpensesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { expenses, loading, expenseStats } = useExpenses();
    const { settings } = useSettings();
    const orgCurrency = settings.currency || "USD";

    const filteredExpenses = expenses.filter(exp =>
        exp.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.note?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-orange-600 uppercase">Total</div>
                    <div className="text-2xl font-bold text-orange-900">{formatCurrency(expenseStats.total || 0, orgCurrency)}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-green-600 uppercase">Billable</div>
                    <div className="text-2xl font-bold text-green-900">{formatCurrency(expenseStats.billable || 0, orgCurrency)}</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-gray-600 uppercase">Non Billable</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(expenseStats.nonBillable || 0, orgCurrency)}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-blue-600 uppercase">Count</div>
                    <div className="text-2xl font-bold text-blue-900">{expenseStats.count || 0}</div>
                </div>
            </div>

            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/dashboard/expenses/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                            <Plus className="mr-2 h-4 w-4" />New Expense
                        </Button>
                    </Link>
                    <Button variant="outline" size="icon"><Upload className="h-4 w-4" /></Button>
                </div>

                <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search expenses..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-12 text-center"><Checkbox /></TableHead>
                            <TableHead className="font-semibold text-gray-900">Category</TableHead>
                            <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                            <TableHead className="font-semibold text-gray-900">Date</TableHead>
                            <TableHead className="font-semibold text-gray-900">Payment Mode</TableHead>
                            <TableHead className="font-semibold text-gray-900">Billable</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredExpenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    {searchQuery ? "No expenses match your search." : "No expenses found. Record your first one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredExpenses.map((exp) => (
                                <TableRow key={exp.id} className="group hover:bg-gray-50">
                                    <TableCell className="text-center"><Checkbox /></TableCell>
                                    <TableCell className="min-w-[200px] py-3">
                                        <div className="flex flex-col group">
                                            <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                                                {exp.categoryName}
                                            </span>
                                            <span className="text-gray-500 text-xs mt-0.5 group-hover:hidden">{exp.note || "No details"}</span>
                                            <div className="hidden group-hover:flex items-center gap-3 mt-0.5">
                                                <Link href={`/dashboard/expenses/${exp.id}/edit`} className="text-xs font-medium text-gray-900 hover:underline">
                                                    Edit
                                                </Link>
                                                <span className="text-gray-300">|</span>
                                                <Link href={`/dashboard/expenses/${exp.id}/delete`} className="text-xs font-medium text-red-600 hover:underline">
                                                    Delete
                                                </Link>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{formatCurrency(exp.amount, exp.currency)}</TableCell>
                                    <TableCell className="text-gray-500">{formatDate(exp.date)}</TableCell>
                                    <TableCell className="text-gray-500">{exp.paymentMode || "-"}</TableCell>
                                    <TableCell>
                                        {exp.billable ? (
                                            <span className="text-green-600 font-medium">Yes</span>
                                        ) : (
                                            <span className="text-gray-400">No</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 font-medium">Total: {filteredExpenses.length}</span>
                </div>
            </div>
        </div>
    );
}
