"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
    variant?: "stats" | "list" | "chart" | "actions";
    className?: string;
}

export function WidgetSkeleton({ variant = "stats", className }: WidgetSkeletonProps) {
    if (variant === "stats") {
        return (
            <div className={cn("space-y-4 animate-pulse", className)}>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                </div>
            </div>
        );
    }

    if (variant === "list") {
        return (
            <div className={cn("space-y-3 animate-pulse", className)}>
                <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12" />
                </div>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === "chart") {
        return (
            <div className={cn("space-y-4 animate-pulse", className)}>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>
        );
    }

    if (variant === "actions") {
        return (
            <div className={cn("space-y-2 animate-pulse", className)}>
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return <Skeleton className={cn("h-full w-full", className)} />;
}
