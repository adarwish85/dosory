"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinancialAuditLogs } from "@/lib/hooks/use-financial-audit-logs";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuditLogPage() {
    const { profile } = useUserProfile();
    const { logs, loading, fetchLogs } = useFinancialAuditLogs();
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (profile?.orgId) {
            fetchLogs();
        }
    }, [profile?.orgId, fetchLogs]);

    const getActionBadge = (action: string) => {
        switch (action) {
            case "create":
                return (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                        Create
                    </Badge>
                );
            case "update":
                return (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Update
                    </Badge>
                );
            case "delete":
                return <Badge variant="destructive">Delete</Badge>;
            default:
                return <Badge variant="secondary">{action}</Badge>;
        }
    };

    const filteredLogs = logs.filter(
        (log) =>
            log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Financial Audit Logs"
                description="Track all financial actions, updates, and deletions for compliance and security."
            >
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </PageHeader>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>Recent financial modifications.</CardDescription>
                        </div>
                        <div className="w-64 relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[100px]">Action</TableHead>
                                <TableHead className="w-[150px]">Entity</TableHead>
                                <TableHead className="w-[200px]">User (ID)</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        Loading logs...
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No audit logs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {log.timestamp ? format(log.timestamp.toDate(), "MMM d, HH:mm:ss") : "-"}
                                        </TableCell>
                                        <TableCell>{getActionBadge(log.action)}</TableCell>
                                        <TableCell className="font-medium capitalize">
                                            {log.entityType.replace("_", " ")}
                                        </TableCell>
                                        <TableCell
                                            className="text-xs font-mono text-muted-foreground truncate max-w-[150px]"
                                            title={log.userId}
                                        >
                                            {log.userId}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                            {log.details ? JSON.stringify(log.details) : "-"}
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
