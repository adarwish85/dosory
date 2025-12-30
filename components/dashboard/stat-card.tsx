import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    current: number;
    total?: number;
    icon?: React.ReactNode;
    progress?: number;
    progressColor?: string;
    className?: string;
}

export function StatCard({
    title,
    current,
    total,
    icon,
    progress,
    progressColor = "bg-blue-600",
    className,
}: StatCardProps) {
    return (
        <Card className={cn("overflow-hidden border border-gray-100 shadow-sm rounded-xl py-0 gap-0", className)}>
            <CardContent className="px-4 py-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                        {icon && <div className="text-gray-500 shrink-0 h-5 w-5">{icon}</div>}
                        <h3 className="text-sm font-semibold text-gray-700 truncate" title={title}>
                            {title}
                        </h3>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-sm font-bold text-gray-900">{current}</span>
                        {total !== undefined && total > 0 && (
                            <span className="text-sm text-muted-foreground font-medium">/ {total}</span>
                        )}
                    </div>
                </div>

                {progress !== undefined && (
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
