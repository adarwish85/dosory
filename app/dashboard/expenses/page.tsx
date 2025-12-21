"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Upload, FileText, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useExpenses } from "@/lib/hooks";
import { format } from "date-fns";
import Link from "next/link";

export default function ExpensesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { expenses, loading, expenseStats } = useExpenses();

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
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-md px-4 py-3">
                        <div className="text-sm font-medium text-orange-600">Total</div>
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(expenseStats.total || 0)}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3">
                        <div className="text-sm font-medium text-green-600">Billable</div>
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(expenseStats.billable || 0)}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
                        <div className="text-sm font-medium text-gray-600">Non Billable</div>
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(expenseStats.nonBillable || 0)}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
                        <div className="text-sm font-medium text-blue-600">Count</div>
                        <div className="text-lg font-bold text-gray-900">{expenseStats.count || 0}</div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/expenses/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                            <Plus className="mr-2 h-4 w-4" /> Record Expense
                        </Button>
                    </Link>
                    <Button variant="outline" className="text-gray-700 bg-white">
                        <Upload className="mr-2 h-4 w-4" /> Import Expenses
                    </Button>
                    <Button variant="outline" size="icon" className="text-gray-500">
                        <FileText className="h-4 w-4" />
                    </Button>
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
                        <Button variant="outline">Bulk Actions</Button>
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
                                    <TableRow key={exp.id} className="group">
                                        <TableCell className="text-center"><Checkbox /></TableCell>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            {exp.categoryName}
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
            </div>
        </div>
    );
}
