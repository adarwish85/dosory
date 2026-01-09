"use client";

import { Loader2 } from "lucide-react";

/**
 * Dashboard loading skeleton with streaming support
 * Displayed immediately while dashboard content loads
 */
export default function DashboardLoading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-96 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-10 w-10 bg-muted rounded animate-pulse" />
                </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 bg-card border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-full bg-muted rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Main content area skeleton */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 bg-card border rounded-lg p-6 space-y-4">
                    <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-card border rounded-lg p-6 space-y-4">
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading indicator */}
            <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-card border rounded-full px-4 py-2 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
        </div>
    );
}
