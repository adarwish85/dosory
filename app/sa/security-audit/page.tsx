"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuditLogEntry } from "@/lib/types/super-admin";
import { Shield, Search, Filter } from "lucide-react";

const actionColors: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    update: "bg-blue-100 text-blue-800",
    delete: "bg-red-100 text-red-800",
    toggle: "bg-purple-100 text-purple-800"
};

export default function SecurityAuditPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch("/api/sa/audit-logs");
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setLogs(data.logs || []);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.targetType.toLowerCase().includes(search.toLowerCase()) ||
            log.actorEmail?.toLowerCase().includes(search.toLowerCase());
        const matchesAction = actionFilter === "all" || log.action.includes(actionFilter);
        return matchesSearch && matchesAction;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Security & Audit</h1>
                <p className="text-muted-foreground">View platform-wide audit logs and security events</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="toggle">Toggle</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            )}

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Log</CardTitle>
                    <CardDescription>Recent administrative actions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <Shield className="h-10 w-10 opacity-50" />
                                            <div>
                                                <p className="font-medium">No audit logs found</p>
                                                <p className="text-sm">Actions will appear here as they occur</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map(log => {
                                    const actionType = log.action.split("_")[0];
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <Badge className={actionColors[actionType] || "bg-gray-100 text-gray-800"}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-muted-foreground">{log.targetType}:</span>{" "}
                                                <span className="font-mono text-xs">{log.targetId?.slice(0, 8)}...</span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {log.actorEmail || log.actorUserId?.slice(0, 8)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {log.createdAt?.toDate?.()?.toLocaleString() || "—"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono max-w-xs truncate">
                                                {JSON.stringify(log.payload || {})}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
