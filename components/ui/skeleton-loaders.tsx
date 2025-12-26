import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = memo(function TableSkeleton({ rows = 10, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="w-full space-y-3">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={colIndex} className={`h-10 ${colIndex === 0 ? "w-12" : "flex-1"}`} />
                    ))}
                </div>
            ))}
        </div>
    );
});

export const CardSkeleton = memo(function CardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-6">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-1/2" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    );
});

export const StatCardSkeleton = memo(function StatCardSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-8 rounded" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-3 w-full" />
                </div>
            ))}
        </div>
    );
});

// Profile page skeleton
export const ProfileSkeleton = memo(function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
});

// List item skeleton for inline use
export const ListItemSkeleton = memo(function ListItemSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
});

// Form skeleton
export const FormSkeleton = memo(function FormSkeleton({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-32 mt-4" />
        </div>
    );
});

