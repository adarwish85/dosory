"use client";

import { useEmployees } from "@/lib/hooks/use-employees";
import { useAttendance } from "@/lib/hooks/use-attendance";
import { useLeaveRequests } from "@/lib/hooks/use-leaves";
import { usePayrollInputs } from "@/lib/hooks/use-payroll";
import { useDepartments } from "@/lib/hooks/use-hr-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, CalendarDays, DollarSign, Building2, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function HRReportsPage() {
    const { employees, employeeStats, loading: employeesLoading } = useEmployees();
    const { departments } = useDepartments();
    const { logs: attendanceLogs, loading: attendanceLoading } = useAttendance({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
    });
    const { requests: leaveRequests, loading: leavesLoading } = useLeaveRequests();
    const { payrollInputs, totalPayrollCost, loading: payrollLoading } = usePayrollInputs();

    const loading = employeesLoading || attendanceLoading || leavesLoading || payrollLoading;

    // Calculate employee distribution by department
    const employeesByDept = departments.map((dept) => ({
        name: dept.name,
        count: employees.filter((e) => e.departmentId === dept.id).length,
    }));

    // Calculate attendance stats for the month
    const attendanceStats = {
        totalClockIns: attendanceLogs.filter((l) => l.clockIn).length,
        totalLateArrivals: attendanceLogs.filter((l) => l.isLate).length,
        totalOvertime: attendanceLogs.reduce((sum, l) => sum + (l.overtimeMinutes || 0), 0),
    };

    // Calculate leave stats
    const leaveStats = {
        total: leaveRequests.length,
        approved: leaveRequests.filter((r) => r.status === "approved").length,
        pending: leaveRequests.filter((r) => r.status === "pending").length,
        rejected: leaveRequests.filter((r) => r.status === "rejected").length,
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold">HR Reports</h2>
                <p className="text-gray-500">Overview of workforce metrics and analytics</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Workforce</p>
                                <p className="text-2xl font-bold">{employeeStats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <Clock className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Attendance Rate</p>
                                <p className="text-2xl font-bold">
                                    {employeeStats.total > 0
                                        ? Math.round((attendanceStats.totalClockIns / employeeStats.total) * 100)
                                        : 0}
                                    %
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-full">
                                <CalendarDays className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Leave Requests</p>
                                <p className="text-2xl font-bold">{leaveStats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-full">
                                <DollarSign className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Monthly Payroll</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalPayrollCost)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Report Tabs */}
            <Tabs defaultValue="headcount">
                <TabsList>
                    <TabsTrigger value="headcount">Headcount</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leaves">Leaves</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                </TabsList>

                <TabsContent value="headcount" className="mt-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Employees by Department
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Department</TableHead>
                                            <TableHead className="text-right">Count</TableHead>
                                            <TableHead className="text-right">%</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employeesByDept.map((dept) => (
                                            <TableRow key={dept.name}>
                                                <TableCell>{dept.name}</TableCell>
                                                <TableCell className="text-right">{dept.count}</TableCell>
                                                <TableCell className="text-right">
                                                    {employeeStats.total > 0
                                                        ? Math.round((dept.count / employeeStats.total) * 100)
                                                        : 0}
                                                    %
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Employee Status Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-green-500" />
                                            Active
                                        </span>
                                        <span className="font-medium">{employeeStats.active}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                                            On Leave
                                        </span>
                                        <span className="font-medium">{employeeStats.onLeave}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-red-500" />
                                            Terminated
                                        </span>
                                        <span className="font-medium">{employeeStats.terminated}</span>
                                    </div>
                                    <hr />
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                                            Full-time
                                        </span>
                                        <span className="font-medium">{employeeStats.fullTime}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-purple-500" />
                                            Part-time
                                        </span>
                                        <span className="font-medium">{employeeStats.partTime}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-gray-500" />
                                            Contractor
                                        </span>
                                        <span className="font-medium">{employeeStats.contractor}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {format(new Date(), "MMMM yyyy")} Attendance Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-green-600">
                                        {attendanceStats.totalClockIns}
                                    </p>
                                    <p className="text-sm text-green-600">Total Clock-ins</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-amber-600">
                                        {attendanceStats.totalLateArrivals}
                                    </p>
                                    <p className="text-sm text-amber-600">Late Arrivals</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-purple-600">
                                        {Math.round(attendanceStats.totalOvertime / 60)}h
                                    </p>
                                    <p className="text-sm text-purple-600">Total Overtime</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaves" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Leave Request Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="p-4 bg-blue-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-blue-600">{leaveStats.total}</p>
                                    <p className="text-sm text-blue-600">Total Requests</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-green-600">{leaveStats.approved}</p>
                                    <p className="text-sm text-green-600">Approved</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-amber-600">{leaveStats.pending}</p>
                                    <p className="text-sm text-amber-600">Pending</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-red-600">{leaveStats.rejected}</p>
                                    <p className="text-sm text-red-600">Rejected</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payroll" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Payroll Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Base Salary</TableHead>
                                        <TableHead className="text-right">Allowances</TableHead>
                                        <TableHead className="text-right">Deductions</TableHead>
                                        <TableHead className="text-right">Net Salary</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollInputs.slice(0, 10).map((payroll) => (
                                        <TableRow key={payroll.id}>
                                            <TableCell>{payroll.employeeName}</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(payroll.baseSalary)}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600">
                                                +{formatCurrency(payroll.totalAllowances)}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                -{formatCurrency(payroll.totalDeductions)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(payroll.netSalary)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-gray-50 font-semibold">
                                        <TableCell>Total</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(
                                                payrollInputs.reduce((sum, p) => sum + p.baseSalary, 0)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">
                                            +
                                            {formatCurrency(
                                                payrollInputs.reduce((sum, p) => sum + p.totalAllowances, 0)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            -
                                            {formatCurrency(
                                                payrollInputs.reduce((sum, p) => sum + p.totalDeductions, 0)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totalPayrollCost)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
