"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useProjects } from "@/lib/hooks/use-projects";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
    FileText,
    BarChart2,
    TrendingUp,
    DollarSign,
    Users,
    Briefcase,
    Receipt,
    Download,
    Calendar,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type DateRangeOption = "7d" | "30d" | "90d" | "12m" | "ytd" | "all";

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "12m", label: "Last 12 months" },
    { value: "ytd", label: "Year to date" },
    { value: "all", label: "All time" },
];

function getDateRange(option: DateRangeOption): { start: Date; end: Date } {
    const now = new Date();
    const end = now;
    let start: Date;

    switch (option) {
        case "7d":
            start = subDays(now, 7);
            break;
        case "30d":
            start = subDays(now, 30);
            break;
        case "90d":
            start = subDays(now, 90);
            break;
        case "12m":
            start = subMonths(now, 12);
            break;
        case "ytd":
            start = new Date(now.getFullYear(), 0, 1);
            break;
        case "all":
        default:
            start = new Date(2020, 0, 1);
            break;
    }

    return { start, end };
}

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState<DateRangeOption>("30d");
    const { invoices, loading: invoicesLoading } = useInvoices({});
    const { customers, loading: customersLoading } = useCustomers();
    const { projects, loading: projectsLoading } = useProjects({});
    const { expenses, loading: expensesLoading } = useExpenses({});

    const loading = invoicesLoading || customersLoading || projectsLoading || expensesLoading;

    // Filter data by date range
    const { start, end } = getDateRange(dateRange);

    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            if (!inv.date) return false;
            const invDate = inv.date.toDate();
            return isWithinInterval(invDate, { start, end });
        });
    }, [invoices, start, end]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter((exp) => {
            if (!exp.date) return false;
            const expDate = exp.date.toDate();
            return isWithinInterval(expDate, { start, end });
        });
    }, [expenses, start, end]);

    // Calculate summary stats
    const stats = useMemo(() => {
        const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
        const totalDue = filteredInvoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const profit = totalPaid - totalExpenses;
        const profitMargin = totalPaid > 0 ? (profit / totalPaid) * 100 : 0;
        const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalPaid,
            totalDue,
            totalExpenses,
            profit,
            profitMargin,
            collectionRate,
            invoiceCount: filteredInvoices.length,
            paidCount: filteredInvoices.filter((i) => i.status === "paid").length,
            overdueCount: filteredInvoices.filter((i) => i.status === "overdue").length,
        };
    }, [filteredInvoices, filteredExpenses]);

    // Revenue by customer
    const revenueByCustomer = useMemo(() => {
        const customerRevenue = new Map<string, { name: string; revenue: number; invoices: number }>();

        filteredInvoices.forEach((inv) => {
            const existing = customerRevenue.get(inv.customerId) || {
                name: inv.customerName || "Unknown",
                revenue: 0,
                invoices: 0,
            };
            existing.revenue += inv.total || 0;
            existing.invoices += 1;
            customerRevenue.set(inv.customerId, existing);
        });

        return Array.from(customerRevenue.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredInvoices]);

    // Revenue by project
    const revenueByProject = useMemo(() => {
        const projectRevenue = new Map<string, { name: string; revenue: number; invoices: number }>();

        filteredInvoices.forEach((inv) => {
            if (!inv.projectId) return;
            const existing = projectRevenue.get(inv.projectId) || {
                name: inv.projectName || "Unknown",
                revenue: 0,
                invoices: 0,
            };
            existing.revenue += inv.total || 0;
            existing.invoices += 1;
            projectRevenue.set(inv.projectId, existing);
        });

        return Array.from(projectRevenue.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredInvoices]);

    // Expenses by category
    const expensesByCategory = useMemo(() => {
        const categoryExpenses = new Map<string, { name: string; amount: number; count: number }>();

        filteredExpenses.forEach((exp) => {
            const category = exp.categoryId || "Uncategorized";
            const existing = categoryExpenses.get(category) || {
                name: category,
                amount: 0,
                count: 0,
            };
            existing.amount += exp.amount || 0;
            existing.count += 1;
            categoryExpenses.set(category, existing);
        });

        return Array.from(categoryExpenses.values()).sort((a, b) => b.amount - a.amount);
    }, [filteredExpenses]);

    // Invoice status breakdown
    const invoiceStatusBreakdown = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        filteredInvoices.forEach((inv) => {
            statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
        });
        return statusCounts;
    }, [filteredInvoices]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-[400px] rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Reports</h1>
                    <p className="text-muted-foreground">Financial insights and business analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/reports/profit-loss">Profit & Loss</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/reports/balance-sheet">Balance Sheet</Link>
                    </Button>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {dateRangeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                                <p className="text-2xl font-bold text-green-900">
                                    {formatCurrency(stats.totalRevenue)}
                                </p>
                            </div>
                            <div className="p-2 bg-green-500 rounded-lg">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">{stats.invoiceCount} invoices</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Collected</p>
                                <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.totalPaid)}</p>
                            </div>
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Receipt className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                            <Progress value={stats.collectionRate} className="h-1.5 flex-1" />
                            <span className="text-xs text-blue-600">{stats.collectionRate.toFixed(0)}%</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 font-medium">Outstanding</p>
                                <p className="text-2xl font-bold text-amber-900">{formatCurrency(stats.totalDue)}</p>
                            </div>
                            <div className="p-2 bg-amber-500 rounded-lg">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-amber-600 mt-2">{stats.overdueCount} overdue</p>
                    </CardContent>
                </Card>

                <Card
                    className={`bg-gradient-to-br ${stats.profit >= 0 ? "from-emerald-50 to-emerald-100 border-emerald-200" : "from-red-50 to-red-100 border-red-200"}`}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p
                                    className={`text-sm font-medium ${stats.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                >
                                    Net Profit
                                </p>
                                <p
                                    className={`text-2xl font-bold ${stats.profit >= 0 ? "text-emerald-900" : "text-red-900"}`}
                                >
                                    {formatCurrency(stats.profit)}
                                </p>
                            </div>
                            <div className={`p-2 rounded-lg ${stats.profit >= 0 ? "bg-emerald-500" : "bg-red-500"}`}>
                                {stats.profit >= 0 ? (
                                    <ArrowUpRight className="h-5 w-5 text-white" />
                                ) : (
                                    <ArrowDownRight className="h-5 w-5 text-white" />
                                )}
                            </div>
                        </div>
                        <p className={`text-xs mt-2 ${stats.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {stats.profitMargin.toFixed(1)}% margin
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Reports */}
            <Tabs defaultValue="revenue" className="space-y-4">
                <TabsList className="bg-gray-100">
                    <TabsTrigger value="revenue" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Revenue
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Customers
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Projects
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" /> Expenses
                    </TabsTrigger>
                </TabsList>

                {/* Revenue Tab */}
                <TabsContent value="revenue" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Invoice Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <PieChart className="h-4 w-4" /> Invoice Status Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(invoiceStatusBreakdown).map(([status, count]) => {
                                        const percent = stats.invoiceCount > 0 ? (count / stats.invoiceCount) * 100 : 0;
                                        const colors: Record<string, string> = {
                                            draft: "bg-gray-400",
                                            sent: "bg-blue-500",
                                            viewed: "bg-purple-500",
                                            partial: "bg-amber-500",
                                            paid: "bg-green-500",
                                            overdue: "bg-red-500",
                                            cancelled: "bg-gray-300",
                                        };
                                        return (
                                            <div key={status} className="flex items-center gap-3">
                                                <div
                                                    className={`w-3 h-3 rounded-full ${colors[status] || "bg-gray-400"}`}
                                                />
                                                <span className="text-sm capitalize flex-1">
                                                    {status.replace("_", " ")}
                                                </span>
                                                <span className="text-sm font-medium">{count}</span>
                                                <div className="w-24 bg-gray-100 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${colors[status] || "bg-gray-400"}`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Invoices */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Recent Invoices</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInvoices.slice(0, 5).map((inv) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">
                                                    {inv.numberFormatted || inv.number}
                                                </TableCell>
                                                <TableCell className="text-gray-500">{inv.customerName}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(inv.total)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {inv.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Customers Tab */}
                <TabsContent value="customers">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Top Customers by Revenue</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-center">Invoices</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="w-40">Share</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {revenueByCustomer.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No customer data available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        revenueByCustomer.map((cust, idx) => {
                                            const share =
                                                stats.totalRevenue > 0 ? (cust.revenue / stats.totalRevenue) * 100 : 0;
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{cust.name}</TableCell>
                                                    <TableCell className="text-center">{cust.invoices}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatCurrency(cust.revenue)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={share} className="h-2 flex-1" />
                                                            <span className="text-xs text-muted-foreground w-10">
                                                                {share.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Revenue by Project</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project</TableHead>
                                        <TableHead className="text-center">Invoices</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="w-40">Share</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {revenueByProject.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No project revenue data available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        revenueByProject.map((proj, idx) => {
                                            const share =
                                                stats.totalRevenue > 0 ? (proj.revenue / stats.totalRevenue) * 100 : 0;
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{proj.name}</TableCell>
                                                    <TableCell className="text-center">{proj.invoices}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatCurrency(proj.revenue)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={share} className="h-2 flex-1" />
                                                            <span className="text-xs text-muted-foreground w-10">
                                                                {share.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {expensesByCategory.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No expense data available
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {expensesByCategory.map((cat, idx) => {
                                            const share =
                                                stats.totalExpenses > 0 ? (cat.amount / stats.totalExpenses) * 100 : 0;
                                            return (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{cat.name}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {formatCurrency(cat.amount)}
                                                        </span>
                                                    </div>
                                                    <Progress value={share} className="h-2" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Expense Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-600">Total Expenses</p>
                                        <p className="text-2xl font-bold text-red-900">
                                            {formatCurrency(stats.totalExpenses)}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Categories</p>
                                            <p className="text-xl font-bold">{expensesByCategory.length}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Transactions</p>
                                            <p className="text-xl font-bold">{filteredExpenses.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
