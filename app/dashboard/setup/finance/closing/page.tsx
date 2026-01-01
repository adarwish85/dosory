"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinancialPeriods } from "@/lib/hooks/use-financial-periods";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function FinancialClosingPage() {
    const { profile } = useUserProfile();
    const { periods, lockDate, fetchPeriods, closePeriod } = useFinancialPeriods();
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (profile?.orgId) {
            fetchPeriods();
        }
    }, [profile?.orgId, fetchPeriods]);

    const handleClosePeriod = async (month: number, year: number) => {
        if (!confirm(`Are you sure you want to close the period ${month}/${year}? This action is irreversible.`))
            return;

        setActionLoading(true);
        try {
            await closePeriod(month, year);
            toast.success("Period closed successfully.");
        } catch (error) {
            toast.error("Failed to close period. See console for details.");
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    // Generate list of recent months (e.g., last 12 months) to show status
    const generateMonths = () => {
        const months = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                month: d.getMonth() + 1,
                year: d.getFullYear(),
                label: format(d, "MMMM yyyy"),
                date: d,
            });
        }
        return months;
    };

    const periodList = generateMonths();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Financial Period Closing"
                description="Manage financial periods and lock dates to prevent changes to historical data."
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Status</CardTitle>
                        <CardDescription>Global financial lock date</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-3 rounded-full ${lockDate ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                            >
                                {lockDate ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Transactions Locked Before</div>
                                <div className="text-2xl font-bold">
                                    {lockDate ? format(lockDate, "MMMM d, yyyy") : "No Lock Date Set"}
                                </div>
                            </div>
                        </div>
                        {lockDate && (
                            <Alert className="mt-4" variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Restricted Access</AlertTitle>
                                <AlertDescription>
                                    You cannot add, edit, or void transactions dated on or before the lock date.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Period History</CardTitle>
                        <CardDescription>Recent monthly periods</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periodList.map((p) => {
                                    // Check if this specific period doc exists in `periods` (which are strictly CLOSED periods)
                                    const closedPeriod = periods.find((cp) => {
                                        const start = cp.startDate.toDate();
                                        return start.getMonth() + 1 === p.month && start.getFullYear() === p.year;
                                    });

                                    const isClosed = !!closedPeriod;
                                    // isLocked logic removed as it was unused

                                    // Actually, if lockDate is Jan 31, Jan is Locked/Closed.
                                    // If we rely on `periods` collection, we are explicit.

                                    return (
                                        <TableRow key={`${p.year}-${p.month}`}>
                                            <TableCell className="font-medium">{p.label}</TableCell>
                                            <TableCell>
                                                {isClosed ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-red-100 text-red-800 hover:bg-red-100"
                                                    >
                                                        Closed
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-green-600 border-green-200"
                                                    >
                                                        Open
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!isClosed && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleClosePeriod(p.month, p.year)}
                                                        disabled={actionLoading}
                                                    >
                                                        Close Period
                                                    </Button>
                                                )}
                                                {isClosed && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Closed on{" "}
                                                        {closedPeriod?.closedAt
                                                            ? format(closedPeriod.closedAt.toDate(), "MMM d")
                                                            : "-"}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
