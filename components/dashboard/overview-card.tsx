import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusItem {
    label: string;
    count: number;
    percentage: number;
    color?: string;
}

interface OverviewCardProps {
    title: string;
    icon?: React.ReactNode;
    items: StatusItem[];
    className?: string;
}

export function OverviewCard({ title, icon, items, className }: OverviewCardProps) {
    return (
        <Card className={cn("h-full border border-gray-100 shadow-sm rounded-xl py-0 gap-0", className)}>
            <CardHeader className="px-4 py-3 pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-50 text-gray-600 rounded-md shrink-0">
                        {icon}
                    </div>
                    <CardTitle className="text-sm font-bold text-gray-900 truncate">
                        {title}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {items.map((item, index) => (
                    <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className={cn("font-medium", item.color)}>{item.count} {item.label}</span>
                            <span className="text-muted-foreground text-xs">{item.percentage.toFixed(1)}%</span>
                        </div>
                        {/* Better approach for dynamic colors in standardized UI */}
                        <div className={`h-2 w-full bg-secondary/30 rounded-full overflow-hidden`}>
                            <div
                                className={cn("h-full rounded-full", item.color?.replace("text-", "bg-") || "bg-primary")}
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
