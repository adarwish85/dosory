"use client";

import { TableSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Leads page loading skeleton
 */
export default function LeadsLoading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-52 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-10 w-28 bg-muted rounded animate-pulse" />
                </div>
            </div>

            {/* Pipeline stats */}
            <div className="grid gap-4 md:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 bg-card border rounded-lg">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-64 bg-muted rounded animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>

            {/* Table */}
            <div className="bg-card border rounded-lg p-4">
                <TableSkeleton rows={10} columns={6} />
            </div>
        </div>
    );
}
