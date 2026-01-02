import { MetricTile } from "@/lib/types/today";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsGridProps {
    metrics: MetricTile[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
    if (metrics.length === 0) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            {metrics.map((metric) => (
                <Card key={metric.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500 font-medium mb-1">{metric.label}</div>
                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                            {metric.trend && (
                                <div
                                    className={`flex items-center text-xs px-2 py-1 rounded-full ${
                                        metric.trend === "up"
                                            ? "bg-green-100 text-green-700"
                                            : metric.trend === "down"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-gray-100 text-gray-700"
                                    }`}
                                >
                                    {metric.trend === "up" ? (
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                    ) : metric.trend === "down" ? (
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                    ) : (
                                        <Minus className="h-3 w-3 mr-1" />
                                    )}
                                    {metric.trendValue || "0%"}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
