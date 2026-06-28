"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupportIssue } from "@/lib/types/super-admin";
import { LifeBuoy, AlertCircle } from "lucide-react";
import { saFetch } from "@/lib/api/saFetch";
import { useTranslation } from "@/lib/i18n";

const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
};

export default function SupportPage() {
    const { t } = useTranslation();
    const [issues, setIssues] = useState<SupportIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const data = await saFetch<{ issues: SupportIssue[] }>("/api/sa/support/issues");
                setIssues(data.issues || []);
            } catch (e: unknown) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };
        fetchIssues();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("sa.support.title")}</h1>
                <p className="text-muted-foreground">{t("sa.support.subtitle")}</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("sa.support.stats.openIssues")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{issues.filter((i) => i.status === "open").length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("sa.support.stats.inProgress")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {issues.filter((i) => i.status === "in_progress").length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("sa.support.stats.critical")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {issues.filter((i) => i.priority === "critical").length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("sa.support.stats.resolvedToday")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">0</div>
                    </CardContent>
                </Card>
            </div>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            )}

            {/* Issues Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("sa.support.activeIssues")}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("sa.support.col.subject")}</TableHead>
                                <TableHead>{t("sa.support.col.tenant")}</TableHead>
                                <TableHead>{t("sa.support.col.priority")}</TableHead>
                                <TableHead>{t("sa.support.col.status")}</TableHead>
                                <TableHead>{t("sa.support.col.created")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-48" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : issues.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <LifeBuoy className="h-10 w-10 opacity-50" />
                                            <div>
                                                <p className="font-medium">{t("sa.support.empty.title")}</p>
                                                <p className="text-sm">{t("sa.support.empty.description")}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                issues.map((issue) => (
                                    <TableRow key={issue.id}>
                                        <TableCell className="font-medium">{issue.subject}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {issue.tenantName || issue.tenantId}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={priorityColors[issue.priority]}>
                                                {t(`sa.support.priority.${issue.priority}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[issue.status]}>
                                                {t(`sa.support.status.${issue.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {issue.createdAt?.toDate?.()?.toLocaleDateString() || "—"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
