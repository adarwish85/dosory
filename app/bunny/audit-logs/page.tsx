"use client";

import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Shield, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function AuditLogsPage() {
    const { logs, loading, refetch } = useAuditLogs();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.targetName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getActionColor = (action: string) => {
        if (action.includes("delete") || action.includes("suspend")) return "bg-red-100 text-red-800 border-red-200";
        if (action.includes("create")) return "bg-green-100 text-green-800 border-green-200";
        if (action.includes("update") || action.includes("edit")) return "bg-blue-100 text-blue-800 border-blue-200";
        if (action.includes("impersonate")) return "bg-purple-100 text-purple-800 border-purple-200";
        return "bg-gray-100 text-gray-800 border-gray-200";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-gray-500">Track all sensitive administrative actions for security and compliance.</p>
                </div>
                <Button variant="outline" onClick={refetch} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-gray-500" />
                            <CardTitle className="text-base font-semibold text-gray-900">System Activity</CardTitle>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[200px]">Performed By</TableHead>
                                <TableHead className="w-[150px]">Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                        Loading audit logs...
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                        No logs found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-gray-50/50">
                                        <TableCell className="text-xs text-gray-500 font-mono whitespace-nowrap">
                                            {log.performedAt}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm text-gray-700">
                                            {log.performedBy}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-mono text-xs font-normal border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {log.targetName}
                                            {log.targetId && <span className="text-xs text-gray-400 block font-mono">{log.targetId.substring(0, 8)}...</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500 max-w-xs truncate" title={JSON.stringify(log.details, null, 2)}>
                                            {JSON.stringify(log.details)}
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
