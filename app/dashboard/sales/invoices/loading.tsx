"use client";

import { TableSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Invoices page loading skeleton
 * Uses streaming to show immediately while data loads
 */
export default function InvoicesLoading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-56 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-10 w-36 bg-muted rounded animate-pulse" />
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 bg-card border rounded-lg">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-64 bg-muted rounded animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>

            {/* Table */}
            <div className="bg-card border rounded-lg p-4">
                <TableSkeleton rows={8} columns={7} />
            </div>
        </div>
    );
}
