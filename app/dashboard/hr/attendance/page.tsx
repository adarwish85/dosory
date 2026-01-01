"use client";

import { useState } from "react";
import { useAttendance, useWorkSchedules } from "@/lib/hooks/use-attendance";
import { useEmployees, useCurrentEmployee } from "@/lib/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, LogIn, LogOut, Calendar, Plus, AlertTriangle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import type { AttendanceStatus } from "@/lib/types/hr-types";

export default function AttendancePage() {
    const { employee: currentEmployee, loading: employeeLoading } = useCurrentEmployee();
    const { employees } = useEmployees({ status: "active" });
    const today = new Date();

    const { logs, loading, clockIn, clockOut, getTodayAttendance } = useAttendance({
        startDate: startOfDay(today),
        endDate: endOfDay(today),
    });

    const [clockingIn, setClockingIn] = useState(false);
    const [clockingOut, setClockingOut] = useState(false);

    const handleClockIn = async () => {
        if (!currentEmployee) return;
        setClockingIn(true);
        try {
            await clockIn(currentEmployee.id, `${currentEmployee.firstName} ${currentEmployee.lastName}`);
            toast.success("Clocked in successfully!");
        } catch (error) {
            toast.error("Failed to clock in");
            console.error(error);
        } finally {
            setClockingIn(false);
        }
    };

    const handleClockOut = async () => {
        if (!currentEmployee) return;
        setClockingOut(true);
        try {
            await clockOut(currentEmployee.id);
            toast.success("Clocked out successfully!");
        } catch (error) {
            toast.error("Failed to clock out");
            console.error(error);
        } finally {
            setClockingOut(false);
        }
    };

    const myTodayAttendance = currentEmployee ? getTodayAttendance(currentEmployee.id) : undefined;
    const hasClockedIn = !!myTodayAttendance?.clockIn;
    const hasClockedOut = !!myTodayAttendance?.clockOut;

    const getStatusBadge = (status: AttendanceStatus) => {
        switch (status) {
            case "present":
                return <Badge className="bg-green-100 text-green-800">Present</Badge>;
            case "late":
                return <Badge className="bg-amber-100 text-amber-800">Late</Badge>;
            case "early_leave":
                return <Badge className="bg-orange-100 text-orange-800">Early Leave</Badge>;
            case "absent":
                return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
            case "on_leave":
                return <Badge className="bg-blue-100 text-blue-800">On Leave</Badge>;
            case "holiday":
                return <Badge className="bg-purple-100 text-purple-800">Holiday</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
        }
    };

    if (loading || employeeLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* My Clock In/Out Card */}
            {currentEmployee && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {format(today, "EEEE, MMMM d, yyyy")}
                                </h3>
                                <p className="text-gray-600">
                                    Welcome, {currentEmployee.firstName}! {hasClockedIn && !hasClockedOut && "You're currently clocked in."}
                                    {hasClockedOut && "You've completed your shift for today."}
                                    {!hasClockedIn && "Don't forget to clock in."}
                                </p>
                                {myTodayAttendance && (
                                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                                        {myTodayAttendance.clockIn && (
                                            <span className="flex items-center gap-1">
                                                <LogIn className="h-4 w-4" />
                                                In: {format(myTodayAttendance.clockIn.toDate(), "hh:mm a")}
                                            </span>
                                        )}
                                        {myTodayAttendance.clockOut && (
                                            <span className="flex items-center gap-1">
                                                <LogOut className="h-4 w-4" />
                                                Out: {format(myTodayAttendance.clockOut.toDate(), "hh:mm a")}
                                            </span>
                                        )}
                                        {myTodayAttendance.workedMinutes && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {Math.floor(myTodayAttendance.workedMinutes / 60)}h{" "}
                                                {myTodayAttendance.workedMinutes % 60}m
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {!hasClockedIn && (
                                    <Button
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={handleClockIn}
                                        disabled={clockingIn}
                                    >
                                        <LogIn className="h-5 w-5 mr-2" />
                                        {clockingIn ? "Clocking In..." : "Clock In"}
                                    </Button>
                                )}
                                {hasClockedIn && !hasClockedOut && (
                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        onClick={handleClockOut}
                                        disabled={clockingOut}
                                    >
                                        <LogOut className="h-5 w-5 mr-2" />
                                        {clockingOut ? "Clocking Out..." : "Clock Out"}
                                    </Button>
                                )}
                                {hasClockedOut && (
                                    <Button size="lg" disabled className="bg-gray-400">
                                        <Clock className="h-5 w-5 mr-2" />
                                        Shift Complete
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Today's Attendance Summary */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">
                            {logs.filter((l) => l.status === "present").length}
                        </p>
                        <p className="text-sm text-gray-500">Present</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600">
                            {logs.filter((l) => l.isLate).length}
                        </p>
                        <p className="text-sm text-gray-500">Late</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">
                            {logs.filter((l) => l.status === "on_leave").length}
                        </p>
                        <p className="text-sm text-gray-500">On Leave</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">
                            {employees.length - logs.length}
                        </p>
                        <p className="text-sm text-gray-500">Not Clocked</p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Attendance Log */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Today's Attendance Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No attendance records for today yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-blue-100 text-blue-600">
                                                {log.employeeName
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{log.employeeName}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {log.clockIn && (
                                                    <span className="flex items-center gap-1">
                                                        <LogIn className="h-3 w-3" />
                                                        {format(log.clockIn.toDate(), "hh:mm a")}
                                                    </span>
                                                )}
                                                {log.clockOut && (
                                                    <span className="flex items-center gap-1">
                                                        <LogOut className="h-3 w-3" />
                                                        {format(log.clockOut.toDate(), "hh:mm a")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {log.hasOvertime && (
                                            <Badge className="bg-purple-100 text-purple-800">
                                                +{Math.floor((log.overtimeMinutes || 0) / 60)}h OT
                                            </Badge>
                                        )}
                                        {log.isLate && (
                                            <Badge className="bg-amber-100 text-amber-800">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Late
                                            </Badge>
                                        )}
                                        {getStatusBadge(log.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
