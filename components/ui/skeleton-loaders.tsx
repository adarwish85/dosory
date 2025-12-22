import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 10, columns = 5 }: { rows?: number; columns?: number }) {
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
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
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
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
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
}
