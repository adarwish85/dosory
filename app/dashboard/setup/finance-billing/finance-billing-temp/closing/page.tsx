"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinancialPeriods } from "@/lib/hooks/use-financial-periods";
import { useTranslation } from "@/lib/i18n";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function FinancialClosingPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const { periods, lockDate, fetchPeriods, closePeriod } = useFinancialPeriods();
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (profile?.orgId) {
            fetchPeriods();
        }
    }, [profile?.orgId, fetchPeriods]);

    const handleClosePeriod = async (month: number, year: number) => {
        if (!confirm(t("setup.closing.confirmClose", { month: String(month), year: String(year) }))) return;

        setActionLoading(true);
        try {
            await closePeriod(month, year);
            toast.success(t("setup.closing.closeSuccess"));
        } catch (error) {
            toast.error(t("setup.closing.closeError"));
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
                title={t("setup.closing.title")}
                description={t("setup.closing.subtitle")}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("setup.closing.currentStatus")}</CardTitle>
                        <CardDescription>{t("setup.closing.currentStatusDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-3 rounded-full ${lockDate ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                            >
                                {lockDate ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">{t("setup.closing.lockedBefore")}</div>
                                <div className="text-2xl font-bold">
                                    {lockDate ? format(lockDate, "MMMM d, yyyy") : t("setup.closing.noLockDate")}
                                </div>
                            </div>
                        </div>
                        {lockDate && (
                            <Alert className="mt-4" variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{t("setup.closing.restrictedAccess")}</AlertTitle>
                                <AlertDescription>
                                    {t("setup.closing.restrictedAccessDesc")}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("setup.closing.periodHistory")}</CardTitle>
                        <CardDescription>{t("setup.closing.periodHistoryDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("setup.closing.colPeriod")}</TableHead>
                                    <TableHead>{t("setup.closing.colStatus")}</TableHead>
                                    <TableHead className="text-right">{t("setup.closing.colAction")}</TableHead>
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
                                                        {t("setup.closing.statusClosed")}
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-green-600 border-green-200"
                                                    >
                                                        {t("setup.closing.statusOpen")}
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
                                                        {t("setup.closing.closePeriod")}
                                                    </Button>
                                                )}
                                                {isClosed && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {t("setup.closing.closedOn")}{" "}
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
