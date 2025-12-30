"use client";

import { TableSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Customers page loading skeleton
 * Uses streaming to show immediately while data loads
 */
export default function CustomersLoading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="h-8 w-40 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-64 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-64 bg-muted rounded animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>

            {/* Table */}
            <div className="bg-card border rounded-lg p-4">
                <TableSkeleton rows={10} columns={6} />
            </div>
        </div>
    );
}
