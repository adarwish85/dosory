import { AlertItem } from "@/lib/types/today";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AlertsSectionProps {
    alerts: AlertItem[];
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
    if (alerts.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Alerts & Risks</h3>
            <div className="space-y-3">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={cn(
                            "flex gap-3 p-3 rounded-md border text-sm",
                            alert.severity === "critical"
                                ? "bg-red-50 border-red-200 text-red-900"
                                : alert.severity === "warning"
                                  ? "bg-orange-50 border-orange-200 text-orange-900"
                                  : "bg-blue-50 border-blue-200 text-blue-900"
                        )}
                    >
                        <div className="shrink-0 mt-0.5">
                            {alert.severity === "critical" ? (
                                <AlertCircle className="h-4 w-4" />
                            ) : alert.severity === "warning" ? (
                                <AlertTriangle className="h-4 w-4" />
                            ) : (
                                <Info className="h-4 w-4" />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">{alert.title}</div>
                            <div className="text-xs opacity-90 mt-1">{alert.message}</div>
                            <Link
                                href={alert.actionUrl}
                                className="block mt-2 font-medium underline underline-offset-2 hover:opacity-80"
                            >
                                Review Now
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
