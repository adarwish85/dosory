"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, AlignJustify } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProjects } from "@/lib/hooks";
import type { ProjectStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";

const statusColors: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
    not_started: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    on_hold: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
    cancelled: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    finished: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

const statusLabels: Record<ProjectStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    on_hold: "On Hold",
    cancelled: "Cancelled",
    finished: "Finished",
};

export default function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
    const { projects, loading, projectStats } = useProjects({ status: statusFilter });

    // PERFORMANCE: Use useMemo to prevent unnecessary recalculations
    const filteredProjects = useMemo(() => {
        return projects.filter(project =>
            (project.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.customerName || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between">
                    <h1 className="text-2xl font-bold">Projects</h1>
                </div>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/projects/new">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                                <Plus className="mr-2 h-4 w-4" /> New Project
                            </Button>
                        </Link>
                        <Button variant="outline" size="icon" className="text-gray-500 bg-white" aria-label="Toggle view">
                            <AlignJustify className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="text-gray-600 bg-white" aria-label="Show filters">
                            <Filter className="mr-2 h-4 w-4" /> Filters
                        </Button>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                    {(["not_started", "in_progress", "on_hold", "cancelled", "finished"] as ProjectStatus[]).map(status => {
                        const colors = statusColors[status];
                        const count = projectStats[status] || 0;
                        const isActive = statusFilter === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(isActive ? "all" : status)}
                                className={`border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors
                                    ${isActive ? `${colors.bg} ${colors.text} ${colors.border}` : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                                <span className="font-bold text-gray-900">{count}</span> {statusLabels[status]}
                            </button>
                        );
                    })}
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
                                <TableHead className="w-10 text-gray-900 font-semibold">#</TableHead>
                                <TableHead className="font-semibold text-gray-900">Name</TableHead>
                                <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900">Progress</TableHead>
                                <TableHead className="font-semibold text-gray-900">Start Date</TableHead>
                                <TableHead className="font-semibold text-gray-900">Deadline</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No projects match your search." : "No projects found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProjects.map((project, index) => {
                                    const colors = statusColors[project.status];
                                    return (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="min-w-[200px] py-3">
                                                <div className="flex flex-col group">
                                                    <Link href={`/dashboard/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                                                        {project.name}
                                                    </Link>
                                                    <span className="text-gray-500 text-xs mt-0.5 group-hover:hidden">ID: {project.id.substring(0, 8)}...</span>
                                                    <div className="hidden group-hover:flex items-center gap-3 mt-0.5">
                                                        <Link href={`/dashboard/projects/${project.id}/settings`} className="text-xs font-medium text-gray-900 hover:underline">
                                                            Edit
                                                        </Link>
                                                        <span className="text-gray-300">|</span>
                                                        <Link href={`/dashboard/projects/${project.id}/settings`} className="text-xs font-medium text-red-600 hover:underline">
                                                            Delete
                                                        </Link>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{project.customerName || "-"}</TableCell>
                                            <TableCell>
                                                <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                                                    {statusLabels[project.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 w-32">
                                                    <Progress value={project.progress || 0} className="h-2" />
                                                    <span className="text-xs text-gray-500">{project.progress || 0}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{formatDate(project.startDate)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(project.deadline)}</TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
